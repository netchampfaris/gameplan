# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

import json
import os
import re

import frappe
import numpy as np
from bs4 import BeautifulSoup
from frappe.utils import cstr

import gameplan

# Constants
RAG_INDEX_BUILD_FLAG = "gameplan_rag_index_in_progress"
DEFAULT_EMBEDDING_DIM = 1536  # OpenAI embedding dimension
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


class GameplanRAGIndexMissingError(Exception):
	pass


class GameplanRAG:
	def __init__(self) -> None:
		self.index_path = os.path.join(frappe.utils.get_site_path(), "gameplan_rag_index")
		self.doc_configs = {
			"GP Discussion": {
				"fields": [
					"name",
					"title",
					"content",
					"last_post_at",
					"modified",
					"project",
					"team",
					"owner",
				],
				"content_field": "content",
				"title_field": "title",
				"modified_field": "last_post_at",
			},
			"GP Task": {
				"fields": ["name", "title", "description", "modified", "project", "team", "owner"],
				"content_field": "description",
				"title_field": "title",
				"modified_field": "modified",
			},
			"GP Page": {
				"fields": ["name", "title", "content", "modified", "project", "team", "owner"],
				"content_field": "content",
				"title_field": "title",
				"modified_field": "modified",
			},
			"GP Comment": {
				"fields": ["name", "content", "modified", "reference_doctype", "reference_name", "owner"],
				"content_field": "content",
				"title_field": None,
				"modified_field": "modified",
				"filters": {"deleted_at": ("is", "not set")},
			},
		}

	def raise_if_not_indexed(self):
		"""Raise error if RAG index doesn't exist"""
		if not self.index_exists():
			raise GameplanRAGIndexMissingError(
				"RAG vector index does not exist. Please build the index first."
			)

	def index_exists(self) -> bool:
		"""Check if the RAG index exists"""
		return os.path.exists(os.path.join(self.index_path, "index.faiss"))

	def get_embedding(self, text: str) -> list[float]:
		"""Get embedding for a text using open source models"""
		try:
			# Use sentence-transformers for embeddings
			from sentence_transformers import SentenceTransformer

			# Initialize model (only done once)
			if not hasattr(self, "_embedding_model"):
				try:
					# Use nomic-embed-text-v1 which is more stable
					self._embedding_model = SentenceTransformer(
						"nomic-ai/nomic-embed-text-v1", trust_remote_code=True
					)
					self._embedding_dim = 768  # Dimension of the nomic-embed-text-v1 model
				except Exception as e:
					frappe.log_error(
						f"Failed to load nomic-embed-text-v1 model, falling back to smaller model: {str(e)}"
					)
					try:
						# Fall back to a smaller model if first one fails
						self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
						self._embedding_dim = 384  # Dimension of the MiniLM model
					except Exception as e2:
						frappe.log_error(f"Failed to load fallback model: {str(e2)}")
						return [0.0] * DEFAULT_EMBEDDING_DIM

			# Process text in smaller chunks if it's too long
			if len(text) > 5000:
				# For very long texts, split and average the embeddings
				chunks = [text[i : i + 5000] for i in range(0, len(text), 4000)]  # Overlap of 1000
				embeddings_list = []

				# Process in batches of 5 chunks to avoid memory issues
				batch_size = 5
				for i in range(0, len(chunks), batch_size):
					batch = chunks[i : i + batch_size]
					batch_embeddings = self._embedding_model.encode(batch)
					embeddings_list.extend(batch_embeddings)

				# Average the embeddings
				embeddings = np.mean(np.array(embeddings_list), axis=0)
			else:
				embeddings = self._embedding_model.encode(text)

			return embeddings.tolist()
		except ImportError:
			frappe.log_error("sentence-transformers not available for RAG search")
			# Return a zero vector as fallback
			return [0.0] * DEFAULT_EMBEDDING_DIM
		except Exception as e:
			frappe.log_error(f"Error generating embeddings: {str(e)}")
			return [0.0] * DEFAULT_EMBEDDING_DIM

	def chunk_text(self, text: str) -> list[str]:
		"""Split text into chunks for embedding"""
		if not text:
			return []

		chunks = []
		for i in range(0, len(text), CHUNK_SIZE - CHUNK_OVERLAP):
			chunk = text[i : i + CHUNK_SIZE]
			if chunk:
				chunks.append(chunk)

		return chunks

	def build_index(self):
		"""Build vector index for all documents"""
		try:
			import faiss
			from tqdm import tqdm
		except ImportError:
			frappe.log_error("Required libraries not installed for RAG search")
			return

		# Create index directory if it doesn't exist
		os.makedirs(self.index_path, exist_ok=True)

		# Initialize metadata storage
		metadata = {}
		all_embeddings = []
		records = self.get_records()

		for doc in tqdm(records, desc="Processing documents"):
			doc_chunks, doc_embeddings, doc_metadata = self._process_document(doc)

			if doc_embeddings:
				start_idx = len(all_embeddings)
				all_embeddings.extend(doc_embeddings)

				# Store metadata with index references
				doc_id = f"{doc.doctype}:{doc.name}"
				metadata[doc_id] = {
					"doctype": doc.doctype,
					"name": doc.name,
					"project": getattr(doc, "project", None),
					"team": getattr(doc, "team", None),
					"owner": getattr(doc, "owner", None),
					"chunks": doc_chunks,
					"indices": list(range(start_idx, start_idx + len(doc_embeddings))),
				}

		# Create FAISS index
		if all_embeddings:
			embeddings_array = np.array(all_embeddings).astype("float32")
			index = faiss.IndexFlatL2(embeddings_array.shape[1])
			index.add(embeddings_array)

			# Save index and metadata
			faiss.write_index(index, os.path.join(self.index_path, "index.faiss"))
			with open(os.path.join(self.index_path, "metadata.json"), "w") as f:
				json.dump(metadata, f)

	def _process_document(self, doc) -> tuple:
		"""Process a document into chunks and embeddings"""
		config = self.doc_configs.get(doc.doctype)
		if not config:
			return [], [], {}

		content_field = config["content_field"]
		title_field = config["title_field"]

		# Get content and title
		content = getattr(doc, content_field, "") or ""
		title = getattr(doc, title_field, "") if title_field else ""
		owner = getattr(doc, "owner", None)
		if owner:
			owner = frappe.get_cached_value("User", owner, "full_name")

		# Clean text
		content = self._clean_content(content)

		# Combine title and content
		full_text = f"{owner}: {title}\n\n{content}"

		# Create chunks
		chunks = self.chunk_text(full_text)

		# Get embeddings for each chunk
		embeddings = []
		for chunk in chunks:
			embedding = self.get_embedding(chunk)
			if embedding:
				embeddings.append(embedding)

		# Create metadata
		doc_metadata = {
			"doctype": doc.doctype,
			"name": doc.name,
			"title": title,
			"project": getattr(doc, "project", None),
			"owner": getattr(doc, "owner", None),
		}

		return chunks, embeddings, doc_metadata

	def _clean_content(self, content):
		soup = BeautifulSoup(content, "html.parser")
		text = soup.get_text(separator=" ").strip()  # remove tags
		text = re.sub(r"https?://[^\s]+", "[link]", text)  # replace links
		text = re.sub(r"\s+", " ", text).strip()  # normalize whitespace
		return text

	def search(self, query: str, top_k: int = 5, generate_answer: bool = False):
		"""Search for relevant documents using RAG"""
		self.raise_if_not_indexed()

		try:
			import faiss
		except ImportError:
			frappe.log_error("FAISS not installed for RAG search")
			return {"results": [], "summary": {"total_matches": 0}}

		# Get query embedding
		query_embedding = self.get_embedding(query)
		if not query_embedding:
			return {"results": [], "summary": {"total_matches": 0}}

		# Load index and metadata
		index = faiss.read_index(os.path.join(self.index_path, "index.faiss"))
		with open(os.path.join(self.index_path, "metadata.json"), "r") as f:
			metadata = json.load(f)

		# Search index
		k = min(top_k * 3, index.ntotal)  # Get more results initially for filtering
		if k == 0:
			return {"results": [], "summary": {"total_matches": 0}}

		query_vector = np.array([query_embedding]).astype("float32")
		distances, indices = index.search(query_vector, k)

		# Process results
		results = []
		seen_docs = set()

		# Get accessible projects for filtering
		accessible_projects = self.get_accessible_projects()

		# Find which document each index belongs to
		for idx in indices[0]:
			# Find which document this chunk belongs to
			for doc_id, doc_meta in metadata.items():
				if idx in doc_meta["indices"]:
					# Skip if we already have this doc
					if doc_id in seen_docs:
						continue

					# Check project access
					if doc_meta.get("project") and doc_meta.get("project") not in accessible_projects:
						continue

					# Get chunk index within this document
					chunk_idx = doc_meta["indices"].index(idx)
					chunk_text = doc_meta["chunks"][chunk_idx] if chunk_idx < len(doc_meta["chunks"]) else ""

					doctype, name = doc_id.split(":", 1)

					results.append(
						{
							"id": doc_id,
							"doctype": doctype,
							"name": name,
							"content": chunk_text,
							"project": doc_meta.get("project"),
							"owner": doc_meta.get("owner"),
							"score": float(1.0 / (1.0 + distances[0][list(indices[0]).index(idx)])),
						}
					)

					seen_docs.add(doc_id)
					break

		# Generate answer if requested
		answer = None
		if generate_answer and results:
			answer = self.generate_answer(query, results)

		return {
			"results": results[:top_k],
			"summary": {"total_matches": len(results), "filtered_matches": len(results[:top_k])},
			"answer": answer,
		}

	def generate_answer(self, query: str, results: list[dict]) -> str:
		"""Generate an answer using open source LLM based on the query and retrieved results"""
		try:
			# Prepare context from results
			context = "\n\n".join([f"Document {i + 1}: {r['content']}" for i, r in enumerate(results[:3])])

			# Full prompt
			full_prompt = f"""You are a helpful assistant for Gameplan. Use the provided document
contexts to answer the user's question. If you cannot answer based on the context, say so.

Context information:
{context}

Question: {query}

Answer:"""

			# Try using Ollama first (preferred method)
			try:
				import requests

				# Ollama API endpoint (assuming running locally)
				ollama_url = "http://localhost:11434/api/generate"

				# You can change the model to any model available in your Ollama installation
				payload = {
					"model": "mistral",  # or any other model you have pulled in Ollama
					"prompt": full_prompt,
					"stream": False,
				}

				print(f"\n\n{full_prompt}\n\n")

				response = requests.post(ollama_url, json=payload)
				if response.status_code == 200:
					return response.json().get("response", "")
				else:
					frappe.log_error(f"Ollama error: {response.status_code} - {response.text}")
					raise Exception("Ollama API error")

			except (ImportError, Exception) as e:
				frappe.log_error(f"Ollama not available: {str(e)}")

				# Try using transformers as fallback
				try:
					from transformers import pipeline

					if not hasattr(self, "_hf_pipeline"):
						# Using a smaller model suitable for lower-end machines
						self._hf_pipeline = pipeline(
							"text-generation", model="TinyLlama/TinyLlama-1.1B-Chat-v1.0"
						)

					result = self._hf_pipeline(full_prompt, max_length=500)
					return result[0]["generated_text"].replace(full_prompt, "")
				except ImportError:
					frappe.log_error("No LLM available for RAG search answer generation")
					return "Answer generation requires an LLM, but none is available. Please install Ollama or the transformers library."

		except Exception as e:
			frappe.log_error(f"Error generating answer: {str(e)}")
			return f"Error generating answer: {str(e)}"

	def index_doc(self, doc):
		"""Index a single document"""
		self.raise_if_not_indexed()

		try:
			import faiss
		except ImportError:
			frappe.log_error("FAISS not installed for RAG search")
			return

		# Process document
		chunks, embeddings, _ = self._process_document(doc)
		if not embeddings:
			return

		# Load index and metadata
		index = faiss.read_index(os.path.join(self.index_path, "index.faiss"))
		with open(os.path.join(self.index_path, "metadata.json"), "r") as f:
			metadata = json.load(f)

		# Remove existing document if any
		self.remove_doc(doc)

		# Add new embeddings
		start_idx = index.ntotal
		embeddings_array = np.array(embeddings).astype("float32")
		index.add(embeddings_array)

		# Update metadata
		doc_id = f"{doc.doctype}:{doc.name}"
		metadata[doc_id] = {
			"doctype": doc.doctype,
			"name": doc.name,
			"project": getattr(doc, "project", None),
			"team": getattr(doc, "team", None),
			"owner": getattr(doc, "owner", None),
			"chunks": chunks,
			"indices": list(range(start_idx, start_idx + len(embeddings))),
		}

		# Save index and metadata
		faiss.write_index(index, os.path.join(self.index_path, "index.faiss"))
		with open(os.path.join(self.index_path, "metadata.json"), "w") as f:
			json.dump(metadata, f)

	def remove_doc(self, doc):
		"""Remove a document from the index"""
		self.raise_if_not_indexed()

		try:
			import faiss
			import numpy as np
		except ImportError:
			frappe.log_error("Required libraries not installed for RAG search")
			return

		doc_id = f"{doc.doctype}:{doc.name}"

		# Load metadata
		with open(os.path.join(self.index_path, "metadata.json"), "r") as f:
			metadata = json.load(f)

		if doc_id not in metadata:
			return

		# Get indices to remove
		indices_to_remove = set(metadata[doc_id]["indices"])
		del metadata[doc_id]

		# Load index
		old_index = faiss.read_index(os.path.join(self.index_path, "index.faiss"))

		# Create new index
		dim = old_index.d
		new_index = faiss.IndexFlatL2(dim)

		# Copy embeddings except the ones to remove
		all_indices = np.arange(old_index.ntotal)
		keep_indices = np.array([i for i in all_indices if i not in indices_to_remove])

		if len(keep_indices) > 0:
			# Extract vectors to keep
			vectors = faiss.extract_rows(old_index, keep_indices)
			new_index.add(vectors)

		# Update metadata indices
		new_metadata = {}
		idx_mapping = {}
		new_idx = 0

		for i in range(old_index.ntotal):
			if i not in indices_to_remove:
				idx_mapping[i] = new_idx
				new_idx += 1

		for doc_id, doc_meta in metadata.items():
			new_indices = [idx_mapping[idx] for idx in doc_meta["indices"] if idx in idx_mapping]
			if new_indices:
				new_meta = doc_meta.copy()
				new_meta["indices"] = new_indices
				new_metadata[doc_id] = new_meta

		# Save new index and metadata
		faiss.write_index(new_index, os.path.join(self.index_path, "index.faiss"))
		with open(os.path.join(self.index_path, "metadata.json"), "w") as f:
			json.dump(new_metadata, f)

	def get_records(self):
		"""Get all records for indexing"""
		records = []
		for doctype, config in self.doc_configs.items():
			docs = frappe.db.get_all(doctype, fields=config["fields"], filters=config.get("filters", {}))

			for doc in docs:
				doc.doctype = doctype
				if config["modified_field"] != "modified":
					doc.modified = getattr(doc, config["modified_field"], None) or doc.modified
				records.append(doc)

		return records

	def get_accessible_projects(self):
		"""Get projects accessible to the current user"""
		from pypika.terms import ExistsCriterion

		if gameplan.is_guest():
			GuestAccess = frappe.qb.DocType("GP Guest Access")
			return (
				frappe.qb.from_(GuestAccess)
				.select(GuestAccess.project)
				.distinct()
				.where(GuestAccess.user == frappe.session.user)
				.run(pluck=True)
			)

		Project = frappe.qb.DocType("GP Project")
		Member = frappe.qb.DocType("GP Member")
		member_exists = (
			frappe.qb.from_(Member)
			.select(Member.name)
			.where(Member.parenttype == "GP Team")
			.where(Member.parent == Project.team)
			.where(Member.user == frappe.session.user)
		)
		projects = (
			frappe.qb.from_(Project)
			.select(Project.name)
			.distinct()
			.where((Project.is_private == 0) | ((Project.is_private == 1) & ExistsCriterion(member_exists)))
			.run(pluck=True)
		)
		return [cstr(p) for p in projects]


def build_rag_index():
	"""Build RAG index"""
	frappe.cache().set_value(RAG_INDEX_BUILD_FLAG, True)
	rag = GameplanRAG()
	rag.build_index()
	frappe.cache().set_value(RAG_INDEX_BUILD_FLAG, False)


def build_rag_index_in_background():
	"""Build RAG index in background worker"""
	if not frappe.cache().get_value(RAG_INDEX_BUILD_FLAG):
		frappe.enqueue(build_rag_index, queue="long")


def build_rag_index_if_not_exists():
	"""Build RAG index if it doesn't exist"""
	rag = GameplanRAG()
	if not rag.index_exists():
		build_rag_index()


@frappe.whitelist()
def search(query: str, top_k: int = 5, generate_answer: bool = False):
	"""
	Search documents using RAG (Retrieval Augmented Generation)

	Args:
		query: Search query string
		top_k: Maximum number of results to return
		generate_answer: Whether to generate an answer using LLM

	Returns:
		dict: Search results containing matches and optionally a generated answer
	"""
	try:
		if not query or not query.strip():
			return {
				"results": [],
				"summary": {"total_matches": 0, "filtered_matches": 0},
				"error": "Query cannot be empty",
			}

		rag = GameplanRAG()
		return rag.search(query, top_k=top_k, generate_answer=generate_answer)
	except GameplanRAGIndexMissingError:
		frappe.log_error("RAG search attempted but index is missing")
		return {
			"results": [],
			"summary": {"total_matches": 0, "filtered_matches": 0},
			"error": "Search index does not exist. Please build the index first.",
		}
	except Exception as e:
		frappe.log_error(f"RAG search error: {str(e)}")
		return {
			"results": [],
			"summary": {"total_matches": 0, "filtered_matches": 0},
			"error": f"Error during search: {str(e)}",
		}

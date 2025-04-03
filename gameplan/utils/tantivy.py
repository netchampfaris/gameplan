import json
import os
import re
import time
from datetime import datetime

import frappe
import tantivy
from bs4 import BeautifulSoup


class TantivySearch:
	def __init__(self, verbose=False, max_results=200):
		self.current_time = int(time.time())
		self.verbose = verbose
		self.max_results = max_results
		self.log_file = os.path.join(frappe.utils.get_site_path(), "logs", "search.log")
		os.makedirs(os.path.dirname(self.log_file), exist_ok=True)

		# Set up the index directory
		self.index_dir = os.path.join(frappe.utils.get_site_path(), "tantivy_index")
		os.makedirs(self.index_dir, exist_ok=True)

		# Define schema fields
		self.schema_builder = tantivy.SchemaBuilder()
		self.schema_builder.add_text_field("title", stored=True)
		self.schema_builder.add_text_field("content", stored=True)
		# self.schema_builder.add_integer_field("timestamp", stored=True, fast=True)
		self.schema_builder.add_date_field("timestamp", stored=True, fast=True)
		self.schema_builder.add_text_field("doc_id", stored=True)
		self.schema = self.schema_builder.build()

		# Document storage for previews and highlighting
		self.doc_contents = {}

		# Initialize index
		self._index = None
		self._index_reader = None
		self._index_writer = None
		self._searcher = None

	def _debug(self, *args):
		"""Log debug messages to file if verbose mode is enabled"""
		if self.verbose:
			timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
			message = " ".join(str(arg) for arg in args)
			with open(self.log_file, "a") as f:
				f.write(f"[{timestamp}] {message}\n")

	def _get_index(self):
		"""Get or create the Tantivy index"""
		if self._index is None:
			self._index = tantivy.Index(self.schema, path=self.index_dir)
		return self._index

	def _get_searcher(self):
		"""Get a searcher from the index"""
		if self._searcher is None:
			self._searcher = self._get_index().searcher()
		return self._searcher

	def _get_index_writer(self):
		"""Get the index writer with decent defaults"""
		if self._index_writer is None:
			self._index_writer = self._get_index().writer(50_000_000)  # 50MB memory
		return self._index_writer

	def _refresh_searcher(self):
		"""Refresh the searcher to see newly indexed documents"""
		self._index_reader = None
		self._searcher = None

	def index_exists(self):
		"""Check if the index exists"""
		return os.path.exists(os.path.join(self.index_dir, "meta.json"))

	def index_documents(self, documents):
		"""Build the index from documents"""
		self._debug(f"Indexing {len(documents)} documents")

		# Get a writer for the index
		writer = self._get_index_writer()

		for i, doc in enumerate(documents):
			doc_id = doc["id"]
			title = doc["title"]
			content = doc["content"]
			timestamp = doc["timestamp"]

			# Create Tantivy document
			tantivy_doc = self._create_document(doc_id, title, content, timestamp)
			writer.add_document(tantivy_doc)

			if not hasattr(frappe.local, "request"):
				if i % 100 == 0:
					print(f"Indexed {i + 1}/{len(documents)} documents", end="\r")

		# Commit changes
		writer.commit()
		self._refresh_searcher()

		if not hasattr(frappe.local, "request"):
			print(f"\nIndexed {len(documents)} documents")

		# Save document metadata to disk
		# self._save_doc_contents()

	def drop_index(self):
		writer = self._get_index_writer()
		writer.delete_all_documents()
		writer.commit()

	def _process_content(self, content):
		"""Process content to remove HTML tags and normalize whitespace, similar to FullTextSearch"""
		try:
			soup = BeautifulSoup(content, "html.parser")
			text = soup.get_text(separator=" ").strip()  # remove tags
			text = re.sub(r"https?://[^\s]+", "[link]", text)  # replace links
			text = re.sub(r"\s+", " ", text).strip()  # normalize whitespace
			return text
		except Exception as e:
			self._debug(f"Error processing content: {str(e)}")
			return content

	def _create_document(self, doc_id, title, content, timestamp):
		"""Create a Tantivy document from the document data"""

		doc = tantivy.Document(
			doc_id=doc_id,
			title=title,
			content=self._process_content(content),
			timestamp=datetime.fromtimestamp(timestamp),
		)
		return doc

	def _save_doc_contents(self):
		"""Save document contents to disk for highlighting and preview generation"""
		try:
			doc_contents_path = os.path.join(self.index_dir, "doc_contents.json")
			with open(doc_contents_path, "w") as f:
				json.dump(self.doc_contents, f)
		except Exception as e:
			self._debug(f"Error saving document contents: {str(e)}")

	def _load_doc_contents(self):
		"""Load document contents from disk"""
		try:
			doc_contents_path = os.path.join(self.index_dir, "doc_contents.json")
			if os.path.exists(doc_contents_path):
				with open(doc_contents_path) as f:
					self.doc_contents = json.load(f)
		except Exception as e:
			self._debug(f"Error loading document contents: {str(e)}")
			self.doc_contents = {}

	def index_document(self, document):
		"""Add a single document to the index"""
		if not self.index_exists():
			self.index_documents([document])
			return

		doc_id = document["id"]
		title = document["title"]
		content = document["content"]
		timestamp = document["timestamp"]

		# Store document for highlighting and previews
		# self._load_doc_contents()
		# self.doc_contents[doc_id] = {"title": title, "content": content, "timestamp": timestamp}

		# First, remove existing document if it exists
		self.remove_document(doc_id)

		# Add the document
		writer = self._get_index_writer()
		tantivy_doc = self._create_document(doc_id, title, content, timestamp)
		writer.add_document(tantivy_doc)
		writer.commit()
		self._refresh_searcher()

		# Save updated document contents
		# self._save_doc_contents()

	def remove_document(self, doc_id):
		"""Remove a document from the index"""
		if not self.index_exists():
			return

		writer = self._get_index_writer()
		writer.delete_term(tantivy.Term("doc_id", doc_id))
		writer.commit()
		self._refresh_searcher()

		# Update document contents
		# self._load_doc_contents()
		# if doc_id in self.doc_contents:
		# 	del self.doc_contents[doc_id]
		# 	self._save_doc_contents()

	def _highlight_text(self, text, query_words):
		"""Wrap matching words in <mark> tags"""
		if not query_words:
			return text

		text_words = text.split()
		result = []

		for word in text_words:
			word_lower = word.lower()
			if any(query_word.lower() in word_lower for query_word in query_words):
				result.append(f"<mark>{word}</mark>")
			else:
				result.append(word)

		return " ".join(result)

	def _create_preview(self, text, query_words, context_size=5):
		"""Create a preview of text showing context around matched words with highlighting"""
		if not query_words:
			preview = " ".join(text.split()[:10])
			return preview + "..." if len(text.split()) > 10 else preview

		text = text.replace("\n", " ")
		words = text.split()
		matches = []

		# Find all occurrences of matched words
		for i, word in enumerate(words):
			if any(query_word.lower() in word.lower() for query_word in query_words):
				start = max(0, i - context_size)
				end = min(len(words), i + context_size + 1)
				matches.append((start, end, i))

		if not matches:
			# If no matches, return first few words
			preview = " ".join(words[:10])
			return preview + "..." if len(words) > 10 else preview

		# Merge overlapping ranges
		matches.sort()
		merged = []
		current_start, current_end, _ = matches[0]

		for start, end, _ in matches[1:]:
			if start <= current_end:
				current_end = max(current_end, end)
			else:
				merged.append((current_start, current_end))
				current_start, current_end = start, end

		merged.append((current_start, current_end))

		# Create preview text with highlighting
		preview = []
		for start, end in merged:
			snippet = []
			for i in range(start, end):
				if i >= len(words):
					continue
				word = words[i]
				if any(query_word.lower() in word.lower() for query_word in query_words):
					snippet.append(f"<mark>{word}</mark>")
				else:
					snippet.append(word)
			preview.append(" ".join(snippet))

		return "..." + "...".join(preview) + "..."

	def search(self, query, title_only=False):
		"""Search the index for documents matching the query"""
		start_time = time.time()
		self._debug(f"\n=== Search Query: '{query}' (title_only: {title_only}) ===")

		if not self.index_exists():
			return {
				"results": [],
				"summary": {
					"duration": 0,
					"total_matches": 0,
					"returned_matches": 0,
					"title_only": title_only,
				},
			}

		# Load document contents for highlighting
		# self._load_doc_contents()

		# Create the query parser and searcher
		searcher = self._get_searcher()
		index = self._get_index()
		index.reload()
		# query = Query.fuzzy_term_query(
		#     index.schema, "title", "mna", transposition_cost_one=False
		# )
		parsed_query = index.parse_query(query, ["title", "content"] if not title_only else ["title"])

		# Search with collector that sorts by score
		search_response = searcher.search(parsed_query, self.max_results)
		# total_matches = search_response.count
		search_results = search_response.hits

		# Extract query terms for highlighting
		query_words = query.split()

		# Process results
		results = []
		for score, doc_address in search_results:
			retrieved_doc = searcher.doc(doc_address)
			doc_id = retrieved_doc["doc_id"][0]

			if not doc_id:
				continue

			title = retrieved_doc["title"][0]
			content = retrieved_doc["content"][0]
			timestamp = retrieved_doc["timestamp"][0]

			# doc_content = self.doc_contents[doc_id]

			# Prepare result
			result = {
				"id": doc_id,
				"title": self._highlight_text(title, query_words),
				"score": score,
				"timestamp": timestamp,
			}

			# Add content preview for non-title-only searches
			if not title_only:
				result["content"] = self._create_preview(content, query_words)

			results.append(result)

		# Calculate duration
		duration = time.time() - start_time

		# Prepare summary
		summary = {
			"duration": round(duration, 3),
			"total_matches": len(search_results),
			"returned_matches": len(results),
			"title_only": title_only,
		}

		self._debug(f"Search completed in {duration:.3f}s with {len(results)} results")
		return {"results": results, "summary": summary}

import os
import re
import sqlite3
import time
from datetime import datetime

import frappe
from bs4 import BeautifulSoup
from frappe.utils import update_progress_bar


class SQLiteSearch:
	def __init__(self, verbose=True, max_results=100):
		self.current_time = int(time.time())
		self.verbose = verbose
		self.max_results = max_results
		self.db_path = os.path.join(frappe.utils.get_site_path(), "sqlite_fts5", "gameplan_search.db")
		self.log_file = os.path.join(frappe.utils.get_site_path(), "sqlite_fts5", "search.log")
		os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
		os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
		self._init_db()

	def _init_db(self):
		"""Initialize the SQLite database with FTS5 virtual tables"""
		conn = self._get_db_connection()
		cursor = conn.cursor()

		# Create documents virtual table with FTS5
		cursor.execute("""
		CREATE VIRTUAL TABLE IF NOT EXISTS document_index USING fts5(
			id UNINDEXED,
			title,
			content,
			timestamp UNINDEXED,
			tokenize='porter unicode61 remove_diacritics 1'
		)
		""")

		# Create a regular table to store document metadata
		cursor.execute("""
		CREATE TABLE IF NOT EXISTS document_metadata(
			id TEXT PRIMARY KEY,
			title TEXT,
			content TEXT,
			timestamp INTEGER,
			doc_length INTEGER
		)
		""")

		conn.commit()
		conn.close()

	def _get_db_connection(self):
		"""Get a connection to the SQLite database"""
		conn = sqlite3.connect(self.db_path)
		# Enable foreign keys
		conn.execute("PRAGMA foreign_keys = ON")
		return conn

	def _debug(self, *args):
		"""Log debug messages to file if verbose mode is enabled"""
		if self.verbose:
			timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
			message = " ".join(str(arg) for arg in args)
			with open(self.log_file, "a") as f:
				f.write(f"[{timestamp}] {message}\n")
			# Also print to console for immediate feedback during debugging
			print(f"[SQLiteSearch] {message}")

	def _process_content(self, content):
		"""Process HTML content to extract plain text"""
		soup = BeautifulSoup(content, "html.parser")
		text = soup.get_text(separator=" ").strip()  # remove tags
		text = re.sub(r"https?://[^\s]+", "[link]", text)  # replace links
		text = re.sub(r"\s+", " ", text).strip()  # normalize whitespace
		return text

	def index_exists(self):
		"""Check if the index exists and has documents"""
		conn = self._get_db_connection()
		cursor = conn.cursor()
		cursor.execute("SELECT COUNT(*) FROM document_index")
		count = cursor.fetchone()[0]
		conn.close()
		return count > 0

	def index_documents(self, documents):
		"""Build the index from documents"""
		conn = self._get_db_connection()
		cursor = conn.cursor()

		# Clear existing index
		cursor.execute("DELETE FROM document_index")
		cursor.execute("DELETE FROM document_metadata")

		total_docs = len(documents)
		total_length = 0

		for i, doc in enumerate(documents):
			doc_id = doc["id"]
			title = doc["title"]
			content = self._process_content(doc["content"])
			timestamp = doc["timestamp"]

			# Calculate document length
			doc_length = len(title.split()) * 3 + len(content.split())
			total_length += doc_length

			# Insert into FTS5 index
			cursor.execute(
				"INSERT INTO document_index (id, title, content, timestamp) VALUES (?, ?, ?, ?)",
				(doc_id, title, content, timestamp),
			)

			# Store original document and metadata
			cursor.execute(
				"INSERT INTO document_metadata (id, title, content, timestamp, doc_length) VALUES (?, ?, ?, ?, ?)",
				(doc_id, title, content, timestamp, doc_length),
			)

			if not hasattr(frappe.local, "request"):
				update_progress_bar("Indexing documents", i + 1, total_docs, absolute=True)

		conn.commit()
		conn.close()

		if not hasattr(frappe.local, "request"):
			print()

		self._debug(f"Indexed {total_docs} documents")

	def drop_index(self):
		"""Drop the index and metadata tables"""
		conn = self._get_db_connection()
		cursor = conn.cursor()
		cursor.execute("DROP TABLE IF EXISTS document_index")
		cursor.execute("DROP TABLE IF EXISTS document_metadata")
		conn.commit()
		conn.close()
		self._debug("Dropped index")

	def index_document(self, document):
		"""Add a single document to the index"""
		conn = self._get_db_connection()
		cursor = conn.cursor()

		doc_id = document["id"]
		title = document["title"]
		content = self._process_content(document["content"])
		timestamp = document["timestamp"]

		# Calculate document length
		doc_length = len(title.split()) * 3 + len(content.split())

		# Remove existing document if present
		cursor.execute("DELETE FROM document_index WHERE id = ?", (doc_id,))
		cursor.execute("DELETE FROM document_metadata WHERE id = ?", (doc_id,))

		# Insert into FTS5 index
		cursor.execute(
			"INSERT INTO document_index (id, title, content, timestamp) VALUES (?, ?, ?, ?)",
			(doc_id, title, content, timestamp),
		)

		# Store original document and metadata
		cursor.execute(
			"INSERT INTO document_metadata (id, title, content, timestamp, doc_length) VALUES (?, ?, ?, ?, ?)",
			(doc_id, title, content, timestamp, doc_length),
		)

		conn.commit()
		conn.close()

		self._debug(f"Indexed document {doc_id}")

	def remove_document(self, doc_id):
		"""Remove a document from the index"""
		conn = self._get_db_connection()
		cursor = conn.cursor()

		# Check if document exists
		cursor.execute("SELECT COUNT(*) FROM document_metadata WHERE id = ?", (doc_id,))
		if cursor.fetchone()[0] == 0:
			conn.close()
			return

		# Remove document from both tables
		cursor.execute("DELETE FROM document_index WHERE id = ?", (doc_id,))
		cursor.execute("DELETE FROM document_metadata WHERE id = ?", (doc_id,))

		conn.commit()
		conn.close()

		self._debug(f"Removed document {doc_id}")

	def _highlight_text(self, text):
		"""Convert SQLite highlight markers to HTML mark tags"""
		return text.replace("\x1b[01;31m", "<mark>").replace("\x1b[00m", "</mark>")

	def _create_fts5_query(self, query_words, use_or_operator=False):
		"""Create an FTS5 query string from query words

		Args:
			query_words: List of words from the query
			use_or_operator: Whether to use OR operator (fallback) instead of AND
		"""
		if not query_words:
			return ""

		# Build query terms with prefix matching for terms with sufficient length
		query_terms = []
		for word in query_words:
			if len(word) >= 3 and use_or_operator:
				# Apply prefix matching to words with 3 or more characters
				query_terms.append(f"{word}*")
			else:
				query_terms.append(word)

		# Join with appropriate operator
		operator = " OR " if use_or_operator else " "
		fts5_query = operator.join(query_terms)

		operator_name = "OR-based" if use_or_operator else "AND-based"
		self._debug(f"Modified FTS5 query with {operator_name} matching: {fts5_query}")
		return fts5_query

	def _calculate_title_match_score(self, title, query_words):
		"""Calculate how well the query matches the document title"""
		title_words = set(re.findall(r"\w+", title.lower()))
		query_words_set = set(query_words)

		# Count matching words
		matching_words = query_words_set.intersection(title_words)

		if not matching_words:
			return 0

		# Calculate both match ratios (how much of query matches title and vice versa)
		query_match_ratio = len(matching_words) / len(query_words_set)
		title_match_ratio = len(matching_words) / len(title_words) if title_words else 0

		# Geometric mean of both ratios with higher weight on query coverage
		combined_score = (query_match_ratio**2 * title_match_ratio) ** (1 / 3)

		# Scale the score to have meaningful impact
		title_match_score = combined_score * 10
		return title_match_score

	def search(self, query, title_only=False, recency_boost=0.005):
		"""Search the index and return results similar to FullTextSearch format

		Args:
			query: Search query string
			title_only: Whether to search only in title field
			recency_boost: Factor to multiply timestamp with (higher gives more weight to recent docs)
		"""
		start_time = time.time()

		if not self.index_exists():
			return {"results": [], "summary": {"duration": 0, "total_matches": 0, "returned_matches": 0}}

		query_words = re.findall(r"\w+", query.lower())
		if not query_words:
			return {"results": [], "summary": {"duration": 0, "total_matches": 0, "returned_matches": 0}}

		self._debug(f"\n=== Search Query: '{query}' (title_only: {title_only}) ===")

		# Execute search with original query
		results = self._execute_search(query_words, title_only, recency_boost, use_or_operator=False)

		# Store whether we used fallback search
		used_fallback_search = False

		# If fewer than 10 results, supplement with OR-based search
		if len(results["results"]) < 10:
			self._debug(
				f"Found only {len(results['results'])} results with AND search, supplementing with OR search"
			)
			or_results = self._execute_search(query_words, title_only, recency_boost, use_or_operator=True)

			# Track existing IDs to avoid duplicates
			existing_ids = {r["id"] for r in results["results"]}

			# Append non-duplicate results from OR search
			for result in or_results["results"]:
				if result["id"] not in existing_ids:
					results["results"].append(result)
					existing_ids.add(result["id"])

			# Update summary
			results["summary"]["total_matches"] += or_results["summary"]["total_matches"]
			results["summary"]["returned_matches"] = len(results["results"])
			used_fallback_search = True

		# Trim to max_results if needed
		if len(results["results"]) > self.max_results:
			results["results"] = results["results"][: self.max_results]
			results["summary"]["returned_matches"] = len(results["results"])

		# Add metadata to summary
		results["summary"]["duration"] = round(time.time() - start_time, 3)
		results["summary"]["used_fallback_search"] = used_fallback_search

		self._debug(
			f"\nReturning {results['summary']['returned_matches']} results "
			f"(used fallback: {used_fallback_search})"
		)

		return results

	def _execute_search(self, query_words, title_only, recency_boost, use_or_operator=False):
		"""Execute search with given parameters"""
		if not query_words:
			self._debug("Warning: Empty query_words passed to _execute_search")
			return {"results": [], "summary": {"total_matches": 0, "returned_matches": 0}}

		# Create FTS5 query with appropriate operator
		fts5_query = self._create_fts5_query(query_words, use_or_operator)
		if not fts5_query:
			self._debug("Warning: Empty FTS5 query generated from query_words")
			return {"results": [], "summary": {"total_matches": 0, "returned_matches": 0}}

		conn = None
		try:
			conn = self._get_db_connection()
			cursor = conn.cursor()
			results_data = []

			if title_only:
				# Search only in title field with recency boost
				search_sql = """
				SELECT
					id,
					highlight(document_index, 1, '\x1b[01;31m', '\x1b[00m') as title_hl,
					timestamp,
					(rank - ? * timestamp) as combined_rank
				FROM document_index
				WHERE title MATCH ?
				ORDER BY combined_rank
				LIMIT ?
				"""
				self._debug(f"FTS5 Query with recency boost: {search_sql} {fts5_query}")
				self._debug(f"Parameters: recency_boost={recency_boost}, max_results={self.max_results}")
				cursor.execute(search_sql, (recency_boost, fts5_query, self.max_results))

				# Process results
				for row in cursor.fetchall():
					doc_id, title_hl, timestamp, combined_rank = row
					result = {
						"id": doc_id,
						"title": self._highlight_text(title_hl),
						"score": 100.0 / (combined_rank + 10),  # Convert rank to score
						"timestamp": timestamp,
					}
					results_data.append(result)
			else:
				# Search in both title and content with improved title matching
				search_sql = """
				SELECT
					id,
					highlight(document_index, 1, '\x1b[01;31m', '\x1b[00m') as title_hl,
					snippet(document_index, 2, '\x1b[01;31m', '\x1b[00m', '...', 10) as content_snippet,
					timestamp,
					title,
					bm25(document_index, 15.0, 1.0) as bm25_rank,
					? * timestamp as recency_rank
				FROM document_index
				WHERE document_index MATCH ?
				ORDER BY (bm25_rank - recency_rank)
				LIMIT ?
				"""
				self._debug(f"FTS5 Query with weighted ranking: {search_sql} {fts5_query}")
				cursor.execute(search_sql, (recency_boost, fts5_query, self.max_results))

				# Process results with additional title match boosting
				for row in cursor.fetchall():
					doc_id, title_hl, content_snippet, timestamp, original_title, bm25_rank, recency_rank = (
						row
					)

					# Calculate base score
					base_rank = bm25_rank - recency_rank
					original_score = 100.0 / (base_rank + 10)

					# Apply title match adjustment
					title_match_score = self._calculate_title_match_score(original_title, query_words)
					adjusted_score = original_score * (1.0 + title_match_score / 5.0)

					result = {
						"id": doc_id,
						"title": self._highlight_text(title_hl),
						"content": self._highlight_text(content_snippet),
						"score": adjusted_score,
						"timestamp": timestamp,
					}

					if title_match_score > 0:
						score_change_percent = ((adjusted_score / original_score) - 1) * 100
						self._debug(
							f"Doc {doc_id} title match: {title_match_score:.2f}, title: '{original_title}'"
						)
						self._debug(
							f"  Score: {original_score:.4f} -> {adjusted_score:.4f} ({score_change_percent:+.1f}% change)"
						)

					results_data.append(result)

			# Sort results by score
			results_data.sort(key=lambda x: x["score"])

			# Get total match count
			if title_only:
				cursor.execute("SELECT COUNT(*) FROM document_index WHERE title MATCH ?", (fts5_query,))
			else:
				cursor.execute(
					"SELECT COUNT(*) FROM document_index WHERE document_index MATCH ?", (fts5_query,)
				)

			total_matches = cursor.fetchone()[0]

		except sqlite3.OperationalError as e:
			frappe.errprint(frappe.get_traceback())
			self._debug(f"Search error: {str(e)}")
			# Check if error is related to FTS5
			if "fts5" in str(e).lower():
				self._debug("This appears to be an FTS5-related error. Checking FTS5 availability...")
				try:
					if conn:
						fts5_enabled = conn.execute("SELECT fts5(?)").fetchone()
						self._debug(f"FTS5 check result: {fts5_enabled}")
				except Exception as check_e:
					self._debug(f"FTS5 check error: {check_e}")
			return {"results": [], "summary": {"total_matches": 0, "returned_matches": 0, "error": str(e)}}
		finally:
			if conn:
				conn.close()

		summary = {
			"total_matches": total_matches,
			"returned_matches": len(results_data),
			"title_only": title_only,
		}

		return {"results": results_data, "summary": summary}

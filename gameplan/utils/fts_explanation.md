# Full-Text Search: How It Works

## 1. Our Example Document

Let's start with a sample document:

```yml
Document

id: doc123
title: How to Build a Search Engine
content: <p>Search engines like <strong>Google</strong> use inverted indexes to quickly find documents. This technique allows for efficient keyword lookups.</p><p>Visit https://example.com for more information.</p>
timestamp: 1623456789

```

## 2. Document Processing

### 2.1. Cleaning the Content

```
# Strip HTML tags

Search engines like Google use inverted indexes to quickly find documents. This technique allows for efficient keyword lookups. Visit https://example.com for more information.

# Replace links with placeholders
Search engines like Google use inverted indexes to quickly find documents. This technique allows for efficient keyword lookups. Visit [link] for more information.

```

### 2.2. Extracting Words

Next, we extract individual words from both title and content:

```
Title Words
"how", "to", "build", "a", "search", "engine"

Content Words
"search", "engines", "like", "google", "use", "inverted", "indexes", "to", "quickly", "find", "documents", "this", "technique", "allows", "for", "efficient", "keyword", "lookups", "visit", "link", "for", "more", "information"
```

### 2.3. Building Word Frequencies

Count word frequencies in both title and content:

```
"how": {"title": 1, "content": 0},
"to": {"title": 1, "content": 1},
"build": {"title": 1, "content": 0},
"a": {"title": 1, "content": 0},
"search": {"title": 1, "content": 1},
"engine": {"title": 1, "content": 0},
"engines": {"title": 0, "content": 1},
```

### 2.4. Document Length Calculation

We calculate the document length with special weighting for title words:

```
Title words are weighted 3x more than content words
total_words = (title word count) * 3 + (content word count)
              = 6 * 3 + 23
              = 18 + 23
              = 41
```

## 3. Building the Inverted Index

The core of a search engine is the inverted index - a data structure that maps words to the documents containing them.

### 3.1. Creating the Index Structure

For each word, we store a list of documents containing that word along with its frequency:

```
inverted_index = {
    "how": [("doc123", 3)],  # 3 = title(1*3) + content(0)
    "to": [("doc123", 4)],   # 4 = title(1*3) + content(1)
    "build": [("doc123", 3)],
    "search": [("doc123", 4)],
    "engine": [("doc123", 3)],
    "engines": [("doc123", 1)],
    # ... and so on
}
```

Note that title words are given 3× weight, which will boost matches in titles during searching.

### 3.2. Building the Trigram Index for Fuzzy Matching

To support fuzzy matching (finding words even when slightly misspelled), we create trigrams (3-letter sequences) for each word:

```
For the word "search":
trigrams = ["  s", " se", "sea", "ear", "arc", "rch", "ch "]

trigram_index = {
    "  s": {"search", "send", "stop", ...},
    " se": {"search", "send", "set", ...},
    "sea": {"search", "seaside", ...},
    # ...and so on
}
```

This allows us to find similar words by comparing trigram overlap.

### 3.3. Calculating Statistics

We calculate and store important statistics for the BM25 ranking algorithm:

```
document_count = 1  # Total number of documents
avg_doc_length = 41  # Average document length
```

## 5. Search Process

### 5.1. Query Processing and Fuzzy Matching

```
Example:
User query: "serch engin optmization"

1. Split into words:
   ["serch", "engin", "optmization"]

2. Fuzzy matching for each word:
   - "serch" → create trigrams ["  s", " se", "ser", "erc", "rch", "ch "]
   - Compare with words in our index
   - Find "search" as best match (highest trigram overlap)

   - "engin" → similar process finds "engine"
   - "optmization" → similar process finds "optimization"

3. Corrected query:
   ["search", "engine", "optimization"]

4. Show suggestion in UI:
   "Did you mean: search engine optimization?"

5. Proceed with the corrected terms for searching
```

### 5.3. BM25 Scoring

```
For each word in the query:

1. Find documents containing the word

2. Calculate IDF (Inverse Document Frequency)
   idf = log((N - n + 0.5) / (n + 0.5) + 1)
   Where:
     N = total number of documents
     n = number of documents containing the word

3. For each document, calculate term frequency component
   tf_component = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc_len / avg_doc_len)))
   Where:
     tf = term frequency

     k1 = Term saturation control
        higher k1 => more weight to documents with more occurences of word
     b = Document length normalization
        1 => longer documents are penalized
        0 => longer documents are treated equally as shorter ones

     k1, b = (typically k1=1.2, b=0.75)
     doc_len = document length
     avg_doc_len = average document length

4. Final BM25 score for a term
   term_score = idf * tf_component
```

### 5.4. Additional Scoring Factors

#### Title Boost

Documents where query words appear in the title receive extra points:

```
Example:
Query: "search engine techniques"

Document title: "How to Build a Search Engine"
- 2 out of 3 query words match the title ("search" and "engine")
- match_ratio = 2/3 = 0.67
- title_boost = 1 + (0.67² * 2) = 1 + (0.45 * 2) = 1 + 0.9 = 1.9
- If BM25 score was 10, final_score = 10 * 1.9 = 19

Document title: "Web Crawler Techniques"
- 1 out of 3 query words match the title ("techniques")
- match_ratio = 1/3 = 0.33
- title_boost = 1 + (0.33² * 2) = 1 + (0.11 * 2) = 1 + 0.22 = 1.22
- If BM25 score was 10, final_score = 10 * 1.22 = 12.2

Document with no title matches:
- match_ratio = 0
- title_boost = 1 + (0² * 2) = 1
- BM25 score remains unchanged
```

#### Recency Boost

Newer documents get a slight boost:

```
age = current_time - document_timestamp
recency_boost = 1 / (1 + 0.001 * age)
final_score = score * recency_boost
```

## 6. Result Highlighting

```
Original text:
"Search engines like Google use inverted indexes..."

Highlighted text:
"<mark>Search</mark> <mark>engines</mark> like Google use inverted indexes..."
```

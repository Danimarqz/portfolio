---
title: "Give the LLM one decision: turning inconsistent PDFs into structured Excel"
description: "Two production AI agents that read public exam PDFs into Excel — deterministic parsing first, OCR only when forced, and the LLM limited to interpreting structure. No hallucinations in the data."
pubDate: 2026-06-27
lang: "en"
tags: ["aws", "bedrock", "textract", "serverless"]
---

OpositaTCAE — a Spanish healthcare exam-prep platform — had a recurring chore.
Every call for applications, the relevant administrations publish admission
lists as PDFs, and each region formats them differently: some are real text,
some are scans, and the columns move around from one document to the next.
Turning those into a usable spreadsheet was manual, slow, and the kind of thing
nobody wants to do twice.

The obvious fix — hand the PDF to an LLM and ask for the table back — is also
the wrong one. An LLM that reads the raw document *and* transcribes the values
*and* decides the structure has three places to hallucinate, and the one that
matters most is the data itself. A wrong applicant ID is worse than no output.

So I built it the other way around. The LLM makes **exactly one decision**, and
it never touches the data.

<pre class="mermaid">
flowchart LR
  PDF[Exam PDF] --> Q{Text layer?}
  Q -->|yes| PARSE[Deterministic parse]
  Q -->|no| OCR[Textract OCR]
  PARSE --> ROWS[Structured rows]
  OCR --> ROWS
  ROWS --> LLM["LLM · one decision:<br/>what is each column?"]
  LLM --> XLSX[(Excel)]
</pre>

## Determinism first, AI only where it pays

The pipeline reads the document deterministically before any model is involved.
PyMuPDF checks whether a page actually has an extractable text layer. If it
does, the rows are parsed directly — no model, no guessing. If it doesn't, the
page is a scan, and only then does it go to Textract for OCR. Either way, what
comes out is **already-structured rows of real values**.

```python
text = page.get_text().strip()
if text:
    rows = parse_text_layout(page)     # deterministic: the values are exact
else:
    rows = ocr_scanned_page(page)      # OCR fallback, only when forced

# the model never sees the raw PDF, only column samples:
columns = classify_columns(header_samples)   # the one decision
```

By the time the LLM is called, the data is fixed. The model is handed a few
sample values per column and asked a single question: *what does this column
represent?* — applicant name, ID number, score, status. It maps structure to
meaning. It does not read, transcribe, or invent a single value.

That's the whole trick. The output varies in *layout* across regions, but the
LLM only ever reasons about layout — never about content. The result is
automatic Excel export with zero hallucinations in the data, because the data
was never the model's job.

## The second agent: two PDFs, one cross-referenced Excel

The same philosophy drives a second pipeline. This one takes two documents — a
question booklet and its answer key — and produces a single richer Excel, ready
to import into the question bank. The hard part isn't reading either file; it's
*pairing* them reliably when their internal numbering doesn't always line up.
Again, the matching is deterministic where it can be, and the model is only
asked to resolve structure, not to decide which answer belongs to which
question by guesswork.

## Why this stack

Both run on AWS Lambda (arm64 Graviton) with Bedrock for the model and Textract
for OCR, deployed with SAM. Serverless fits the access pattern perfectly: this
work happens in bursts, around each call for applications, not as steady
traffic — so paying per invocation beats keeping anything warm.

## The lesson

The instinct with a capable model is to give it more responsibility. The
opposite scales better in production: shrink the model's decision surface to the
smallest thing only a model can do, and let deterministic code own everything
that can be made exact. The AWS Summit this June pushed me toward Bedrock and
Graviton; the design principle is older than any of it. Determinism first. AI
where — and *only* where — it earns its place.

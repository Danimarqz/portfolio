---
title: "A 0 €/month finance pipeline: S3, Go, and an atomic dedup"
description: "Consolidating broker CSVs with an event-driven Lambda — no scrapers, no bank credentials, no duplicates."
pubDate: 2026-06-18
lang: en
tags: ["aws", "go", "dynamodb", "serverless"]
---

I wanted my DEGIRO and MyInvestor operations in one place without handing any
service my bank credentials. The result is **finance-tracker**: drop the broker's
monthly CSV into S3 and it comes out consolidated, deduplicated, and traced in
CloudWatch. Operating cost: **0 €/month**.

<pre class="mermaid">
flowchart LR
  U[Upload CSV] --> S3[("S3 pending/")]
  S3 -->|ObjectCreated| L["Lambda · Go arm64"]
  L -->|"PutItem (conditional)"| DDB[("DynamoDB · source of truth")]
  L -.->|mirror, non-fatal| GS[("Google Sheets")]
  L --> P[("S3 processed/")]
</pre>

## Event-driven, not scheduled scraping

The first instinct is a cron job that logs into each broker and scrapes. That
means storing credentials in the cloud and babysitting fragile scrapers every
time a portal changes its markup. So I inverted it: the **upload is the trigger**.

```
s3://…/pending/<platform>/<file>.csv
        │  s3:ObjectCreated  (prefix=pending/, suffix=.csv)
        ▼
   Lambda (Go, ARM64)
```

No credentials in the cloud, nothing to schedule, nothing to scrape. The
platform is read from the key prefix — `pending/degiro/` dispatches to the
parser registered for `degiro`.

## The interesting part: atomic dedup

Re-uploading the same CSV must not create duplicate operations. Instead of
read-then-write (a race waiting to happen), I let DynamoDB enforce it with a
**conditional write**:

```go
_, err := ddb.PutItem(ctx, &dynamodb.PutItemInput{
    TableName:           aws.String(table),
    Item:                item,
    ConditionExpression: aws.String("attribute_not_exists(id)"),
})
var cfe *types.ConditionalCheckFailedException
if errors.As(err, &cfe) {
    // already ingested — skip, not an error
}
```

The deterministic `id` (derived from the operation's stable fields) plus
`attribute_not_exists(id)` makes ingestion idempotent at the database layer.
Replays are free; no lock, no read, no race.

## Dual-write with a non-fatal mirror

DynamoDB is the **source of truth** — server-side queries, atomic edits,
per-user isolation, no rate limits. A Google Sheet is kept only as a
human-readable mirror, so a Sheets failure is a `WARN`, never a failed run:

1. `PutItem` to DynamoDB (conditional) — **must** succeed.
2. Append to Sheets — best effort, logged if it fails.
3. Move the file to `processed/`. If any step fails, it stays in `pending/`
   for a manual retry, with `request_id` / `bucket` / `key` in the logs.

## Why Go on ARM64

Go compiles to a static binary → ship a **ZIP**, not a container: no ECR bill,
lower cold start, builds without Docker. ARM64 (Graviton) is ~20% cheaper than
x86_64, and static typing is exactly what you want touching financial numbers.

The whole thing lives under the free tier — S3 events, a few Lambda
invocations a month, on-demand DynamoDB, Parameter Store for the one Google
service-account secret (KMS-encrypted, free up to 10k params). Hence the
0 €/month.

The lesson that keeps repeating: push the hard guarantees down to the
infrastructure. The dedup isn't application logic I can get wrong — it's a
condition expression the database enforces every time.

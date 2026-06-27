---
title: "My backend buckled at 1000 concurrent exams: FastAPI to Go"
description: "A predictable load spike, a runtime whose concurrency model didn't fit it, and what a rewrite to Go actually bought."
pubDate: 2026-07-04
lang: en
tags: ["go", "python", "fastapi", "concurrency"]
---

An EdTech platform I work with runs exam simulators. Load on it is not flat — it
spikes, hard and on schedule: when a mock exam opens, something like **1000
candidates** hit the same endpoints inside the same minute. That spike is where
the original FastAPI backend started to creak.

## The symptom

FastAPI is fine — async Python handles I/O-bound traffic well. But under the
exam-open spike, latency climbed and requests started timing out. Adding worker
processes helped a little and then stopped helping: each worker carried its own
memory, and the box filled up before the latency flattened.

## The diagnosis

The mismatch was the **concurrency model**, not the framework. Async Python wins
when you're waiting on I/O and nothing blocks the event loop. But the heavy paths
here weren't pure await-and-yield:

- synchronous work (Excel import, percentile recompute) blocks the loop while it runs;
- the real parallelism story is process-per-worker, and each process is a full
  interpreter with its own memory footprint;
- so "handle 1000 at once" turns into "run N heavyweight workers", and N is
  bounded by RAM long before it's bounded by CPU.

Async is not parallelism. For a spike of mostly-independent, partly-CPU work, I
wanted cheap concurrency with a flat memory cost.

## The decision

I rewrote the hot service in **Go**. The whole pitch fits in three lines:

- goroutines are cheap — thousands in flight on one process, scheduled across all cores;
- bounded **worker pools** cap the concurrency on the expensive operations instead
  of spawning unbounded work;
- it ships as **one static binary** — one small container, one predictable memory
  profile, no per-worker interpreter tax.

<pre class="mermaid">
flowchart LR
  S["spike · ~1000 requests"] --> Q["bounded queue"]
  Q --> P["worker pool · goroutines"]
  P --> DB[("PostgreSQL")]
  P --> R[("Redis · cache + throttle")]
</pre>

The pattern that did the work: a fixed-size pool of goroutines draining a
channel, so the spike is absorbed by the queue and processed at a rate the
database can actually take — backpressure instead of collapse.

```go
sem := make(chan struct{}, maxWorkers) // bound concurrency
for _, job := range jobs {
    sem <- struct{}{}
    go func(j Job) {
        defer func() { <-sem }()
        process(j)
    }(job)
}
```

## The result

Same spike, opposite behaviour. Orders of magnitude on the same instance:

- **p95 latency:** ~4 s with 504s during the spike → **~150 ms**.
- **Sustained throughput:** ~200 req/s before it degraded → **~2000 req/s**.
- **Memory:** ~1.5 GB across interpreter workers → **~60 MB** for one Go binary.

*(Representative figures for the shape of the improvement, not a formal
benchmark.)*

The win wasn't "Go is faster than Python" in a microbenchmark sense — it was that
Go's concurrency and deployment model **match the shape of this workload**:
bursty, partly-CPU, memory-sensitive.

## What I'd take to the next one

- **Pick the runtime for the workload's concurrency shape**, not its benchmark
  headline. Async I/O and CPU bursts are different problems.
- **Rewrite the hot path, not the whole app.** Only the service under spike moved
  to Go; the rest stayed where it was productive.
- **The deployment story is half the win.** A static binary with a flat memory
  curve is operationally calmer than a fleet of interpreter workers — and calm is
  what you want at the exact moment 1000 people show up at once.

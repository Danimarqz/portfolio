---
title: "Fitting a sizing engine inside API Gateway's 29 seconds"
description: "How vectorizing the numerical model with NumPy turned a timeout into headroom."
pubDate: 2026-06-20
lang: en
tags: ["aws", "lambda", "numpy", "serverless"]
---

API Gateway gives you a hard **29-second** integration timeout. For a solar PV
and battery-storage sizing engine that is not a lot of room: you have to read
the inputs, run the numerical model across thousands of hourly steps, and
return a result — all before the gateway hangs up.

<pre class="mermaid">
flowchart LR
  C[Client] -->|request| AGW["API Gateway · 29s limit"]
  AGW --> L[Lambda]
  L -->|NumPy vectorized| R[Result]
  R --> AGW
</pre>

## The naive version

The first version looped in Python, hour by hour, accumulating state. Correct,
readable, and far too slow once the simulation horizon grew. A single request
flirted with the timeout, and any retry storm took the whole thing down.

## Vectorize the model

The fix was not a bigger Lambda. It was deleting the loop. NumPy lets you
express the whole horizon as array operations:

```python
# instead of: for h in range(8760): soc = step(soc, ...)
charge = np.minimum(surplus, max_charge_rate)
soc = np.clip(np.cumsum(charge - discharge), 0, capacity)
```

The per-hour Python overhead disappears into a handful of C-level array passes.
The same calculation that brushed the 29-second ceiling now returns in a couple
of seconds, with room to spare for larger installations.

## The lesson

The constraint was real and fixed — you cannot negotiate with API Gateway. The
degree of freedom was the algorithm. Determinism first, vectorize the hot path,
and let the timeout become headroom instead of a wall.

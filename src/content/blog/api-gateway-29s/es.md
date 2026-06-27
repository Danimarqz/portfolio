---
title: "Meter un motor de dimensionado en los 29 segundos de API Gateway"
description: "Cómo vectorizar el modelo numérico con NumPy convirtió un timeout en margen de sobra."
pubDate: 2026-06-20
lang: es
tags: ["aws", "lambda", "numpy", "serverless"]
---

API Gateway impone un timeout de integración fijo de **29 segundos**. Para un
motor de dimensionado de fotovoltaica y almacenamiento con baterías no es mucho:
hay que leer las entradas, ejecutar el modelo numérico sobre miles de pasos
horarios y devolver un resultado — todo antes de que el gateway corte.

<pre class="mermaid">
flowchart LR
  C[Cliente] -->|request| AGW["API Gateway · límite 29s"]
  AGW --> L[Lambda]
  L -->|vectorizado NumPy| R[Resultado]
  R --> AGW
</pre>

## La versión ingenua

La primera versión iteraba en Python, hora a hora, acumulando estado. Correcta,
legible y demasiado lenta en cuanto crecía el horizonte de simulación. Una sola
petición coqueteaba con el timeout, y cualquier tormenta de reintentos lo tiraba
todo abajo.

## Vectorizar el modelo

La solución no fue una Lambda más grande. Fue borrar el bucle. NumPy permite
expresar todo el horizonte como operaciones sobre arrays:

```python
# en vez de: for h in range(8760): soc = step(soc, ...)
charge = np.minimum(surplus, max_charge_rate)
soc = np.clip(np.cumsum(charge - discharge), 0, capacity)
```

El coste por hora de Python desaparece en unas pocas pasadas de array a nivel C.
El mismo cálculo que rozaba el techo de 29 segundos ahora responde en un par de
segundos, con margen de sobra para instalaciones más grandes.

## La lección

La restricción era real y fija — no se negocia con API Gateway. El grado de
libertad era el algoritmo. Determinismo primero, vectoriza el camino caliente, y
deja que el timeout se convierta en margen en lugar de en muro.

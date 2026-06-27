---
title: "Mi backend se tambaleaba con 1000 exámenes simultáneos: de FastAPI a Go"
description: "Un pico de carga previsible, un runtime cuyo modelo de concurrencia no encajaba, y qué compró de verdad reescribir en Go."
pubDate: 2026-07-04
lang: es
tags: ["go", "python", "fastapi", "concurrency"]
---

Una plataforma EdTech con la que colaboro corre simuladores de examen. Su carga
no es plana — pica, fuerte y a hora fija: cuando se abre un simulacro, del orden
de **1000 candidatos** golpean los mismos endpoints dentro del mismo minuto. Ese
pico es donde el backend original en FastAPI empezó a crujir.

## El síntoma

FastAPI está bien — el Python async lleva bien el tráfico I/O-bound. Pero bajo el
pico de apertura, la latencia subía y las peticiones empezaban a dar timeout.
Añadir procesos worker ayudaba un poco y luego dejaba de ayudar: cada worker
cargaba su propia memoria, y la máquina se llenaba antes de que la latencia se
aplanara.

## El diagnóstico

El desajuste era el **modelo de concurrencia**, no el framework. El Python async
gana cuando esperas I/O y nada bloquea el event loop. Pero los caminos pesados
aquí no eran await-and-yield puro:

- el trabajo síncrono (import de Excel, recálculo de percentiles) bloquea el loop mientras corre;
- el paralelismo real es proceso-por-worker, y cada proceso es un intérprete
  completo con su propia huella de memoria;
- así "atender 1000 a la vez" se convierte en "correr N workers pesados", y N lo
  acota la RAM mucho antes que la CPU.

Async no es paralelismo. Para un pico de trabajo mayormente independiente y en
parte de CPU, quería concurrencia barata con coste de memoria plano.

## La decisión

Reescribí el servicio caliente en **Go**. El argumento entero cabe en tres líneas:

- las goroutines son baratas — miles en vuelo en un proceso, repartidas en todos los cores;
- los **worker pools** acotados limitan la concurrencia en las operaciones caras
  en vez de lanzar trabajo sin límite;
- se entrega como **un único binario estático** — un contenedor pequeño, un perfil
  de memoria predecible, sin el impuesto del intérprete por worker.

<pre class="mermaid">
flowchart LR
  S["pico · ~1000 peticiones"] --> Q["cola acotada"]
  Q --> P["worker pool · goroutines"]
  P --> DB[("PostgreSQL")]
  P --> R[("Redis · caché + throttle")]
</pre>

El patrón que hizo el trabajo: un pool de goroutines de tamaño fijo vaciando un
channel, de modo que el pico lo absorbe la cola y se procesa al ritmo que la base
de datos aguanta de verdad — backpressure en vez de colapso.

```go
sem := make(chan struct{}, maxWorkers) // acota la concurrencia
for _, job := range jobs {
    sem <- struct{}{}
    go func(j Job) {
        defer func() { <-sem }()
        process(j)
    }(job)
}
```

## El resultado

Mismo pico, comportamiento opuesto. Órdenes de magnitud en la misma instancia:

- **Latencia p95:** ~4 s con 504 durante el pico → **~150 ms**.
- **Throughput sostenido:** ~200 req/s antes de degradarse → **~2000 req/s**.
- **Memoria:** ~1,5 GB repartidos entre workers intérprete → **~60 MB** para un único binario Go.

*(Cifras representativas de la forma de la mejora, no un benchmark formal.)*

La victoria no fue "Go es más rápido que Python" en plan microbenchmark — fue que
el modelo de concurrencia y despliegue de Go **encaja con la forma de esta
carga**: a ráfagas, en parte CPU, sensible a memoria.

## Qué me llevo al siguiente

- **Elige el runtime por la forma de concurrencia de la carga**, no por el titular
  del benchmark. I/O async y ráfagas de CPU son problemas distintos.
- **Reescribe el camino caliente, no toda la app.** Solo el servicio bajo pico
  pasó a Go; el resto se quedó donde era productivo.
- **La historia de despliegue es media victoria.** Un binario estático con curva
  de memoria plana es operativamente más tranquilo que una flota de workers
  intérprete — y tranquilidad es justo lo que quieres en el momento exacto en que
  aparecen 1000 personas a la vez.

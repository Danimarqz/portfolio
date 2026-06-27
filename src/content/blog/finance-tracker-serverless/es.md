---
title: "Un pipeline de finanzas a 0 €/mes: S3, Go y un dedup atómico"
description: "Consolidar los CSV del bróker con una Lambda event-driven — sin scrapers, sin credenciales bancarias, sin duplicados."
pubDate: 2026-06-18
lang: es
tags: ["aws", "go", "dynamodb", "serverless"]
---

Quería mis operaciones de DEGIRO y MyInvestor en un único sitio sin darle a
ningún servicio mis credenciales bancarias. El resultado es **finance-tracker**:
subes el CSV mensual del bróker a S3 y sale consolidado, deduplicado y trazado en
CloudWatch. Coste operativo: **0 €/mes**.

<pre class="mermaid">
flowchart LR
  U[Subir CSV] --> S3[("S3 pending/")]
  S3 -->|ObjectCreated| L["Lambda · Go arm64"]
  L -->|"PutItem (condicional)"| DDB[("DynamoDB · fuente de verdad")]
  L -.->|mirror, no-fatal| GS[("Google Sheets")]
  L --> P[("S3 processed/")]
</pre>

## Event-driven, no scraping programado

El instinto inicial es un cron que se loguea en cada bróker y scrapea. Eso
significa guardar credenciales en la nube y mantener scrapers frágiles cada vez
que un portal cambia su HTML. Así que lo invertí: **la subida es el trigger**.

```
s3://…/pending/<plataforma>/<archivo>.csv
        │  s3:ObjectCreated  (prefix=pending/, suffix=.csv)
        ▼
   Lambda (Go, ARM64)
```

Cero credenciales en la nube, nada que programar, nada que scrapear. La
plataforma se lee del prefix de la key — `pending/degiro/` despacha al parser
registrado para `degiro`.

## Lo interesante: dedup atómica

Resubir el mismo CSV no debe crear operaciones duplicadas. En vez de leer-y-luego-
escribir (una race esperando a pasar), dejo que DynamoDB lo imponga con una
**escritura condicional**:

```go
_, err := ddb.PutItem(ctx, &dynamodb.PutItemInput{
    TableName:           aws.String(table),
    Item:                item,
    ConditionExpression: aws.String("attribute_not_exists(id)"),
})
var cfe *types.ConditionalCheckFailedException
if errors.As(err, &cfe) {
    // ya ingerido — se omite, no es error
}
```

El `id` determinista (derivado de los campos estables de la operación) más
`attribute_not_exists(id)` hace la ingesta idempotente en la capa de base de
datos. Los reintentos salen gratis; sin lock, sin lectura, sin race.

## Dual-write con un mirror no-fatal

DynamoDB es la **fuente de verdad** — queries server-side, ediciones atómicas,
aislamiento por usuario, sin rate limits. La Google Sheet se mantiene solo como
mirror legible, así que un fallo de Sheets es un `WARN`, nunca una ejecución
fallida:

1. `PutItem` a DynamoDB (condicional) — **tiene** que ir bien.
2. Append a Sheets — best effort, se loguea si falla.
3. Mover el archivo a `processed/`. Si algún paso falla, se queda en `pending/`
   para reintento manual, con `request_id` / `bucket` / `key` en los logs.

## Por qué Go sobre ARM64

Go compila a un binario estático → se despliega un **ZIP**, no un contenedor: sin
factura de ECR, menor cold start, builds sin Docker. ARM64 (Graviton) es ~20%
más barato que x86_64, y el tipado estático es justo lo que quieres tocando
números financieros.

Todo cabe en la capa gratuita — eventos S3, unas pocas invocaciones de Lambda al
mes, DynamoDB on-demand, Parameter Store para el único secreto del service
account de Google (cifrado con KMS, gratis hasta 10k parámetros). De ahí los
0 €/mes.

La lección que se repite: empuja las garantías difíciles hacia la
infraestructura. El dedup no es lógica de aplicación que pueda equivocarme — es
una condition expression que la base de datos impone cada vez.

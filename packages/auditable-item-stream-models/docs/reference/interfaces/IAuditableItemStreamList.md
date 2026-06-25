# Interface: IAuditableItemStreamList

Interface describing an auditable item stream list.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.twindev.org/ais/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemStreamList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: [`IAuditableItemStream`](IAuditableItemStream.md)[]

The item streams.

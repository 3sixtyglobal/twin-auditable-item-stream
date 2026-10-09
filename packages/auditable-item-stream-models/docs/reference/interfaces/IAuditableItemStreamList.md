# Interface: IAuditableItemStreamList

Interface describing an auditable item stream list.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.3sixty.global/ais/"`, `"https://schema.3sixty.global/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemStreamList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: [`IAuditableItemStream`](IAuditableItemStream.md)[]

The item streams.

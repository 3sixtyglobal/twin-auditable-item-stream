# Interface: IAuditableItemStreamEntryList

Interface describing an auditable item stream entries list.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.3sixty.global/ais/"`, `"https://schema.3sixty.global/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemStreamEntryList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: [`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)[]

The entries in the stream.

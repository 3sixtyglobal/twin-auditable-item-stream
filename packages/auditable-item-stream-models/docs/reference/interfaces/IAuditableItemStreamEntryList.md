# Interface: IAuditableItemStreamEntryList

Interface describing an auditable item stream entries list.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.twindev.org/ais/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemStreamEntryList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: [`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)[]

The entries in the stream.

# Interface: IAuditableItemStreamEntryObjectList

Interface describing an auditable item stream entries object list.

## Properties

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.twindev.org/ais/"`, `"https://schema.twindev.org/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### type {#type}

> **type**: \[`"ItemList"`, `"AuditableItemStreamEntryObjectList"`\]

JSON-LD Type.

***

### itemListElement {#itemlistelement}

> **itemListElement**: `IJsonLdNodeObject`[]

The entry objects in the stream.

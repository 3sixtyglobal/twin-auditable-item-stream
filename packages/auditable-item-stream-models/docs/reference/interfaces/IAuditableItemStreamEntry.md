# Interface: IAuditableItemStreamEntry

Interface describing an entry for the stream.

## Extends

- [`IAuditableItemStreamEntryBase`](IAuditableItemStreamEntryBase.md)

## Properties

### @context? {#context}

> `optional` **@context?**: \[`"https://schema.3sixty.global/ais/"`, `"https://schema.3sixty.global/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

***

### id {#id}

> **id**: `string`

The id of the entry.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the entry was created.

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the entry was modified.

***

### dateDeleted? {#datedeleted}

> `optional` **dateDeleted?**: `string`

The date/time of when the entry was deleted, as we never actually remove items.

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The identity of the user which added the entry to the stream.

***

### index {#index}

> **index**: `number`

The index of the entry in the stream.

***

### proofId? {#proofid}

> `optional` **proofId?**: `string`

The id of the immutable proof.

***

### verification? {#verification}

> `optional` **verification?**: `IImmutableProofVerification`

The verification of the entry.

***

### type {#type}

> **type**: `"AuditableItemStreamEntry"`

JSON-LD Type.

#### Inherited from

[`IAuditableItemStreamEntryBase`](IAuditableItemStreamEntryBase.md).[`type`](IAuditableItemStreamEntryBase.md#type)

***

### entryObject {#entryobject}

> **entryObject**: `IJsonLdNodeObject`

The object to associate with the entry as JSON-LD.

#### Inherited from

[`IAuditableItemStreamEntryBase`](IAuditableItemStreamEntryBase.md).[`entryObject`](IAuditableItemStreamEntryBase.md#entryobject)

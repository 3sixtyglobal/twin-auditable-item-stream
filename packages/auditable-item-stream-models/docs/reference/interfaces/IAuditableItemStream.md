# Interface: IAuditableItemStream

Interface describing an auditable item stream.

## Extends

- [`IAuditableItemStreamBase`](IAuditableItemStreamBase.md)

## Properties

### id {#id}

> **id**: `string`

The id of the stream.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date/time of when the stream was created.

***

### dateModified? {#datemodified}

> `optional` **dateModified?**: `string`

The date/time of when the stream was modified.

***

### organizationIdentity? {#organizationidentity}

> `optional` **organizationIdentity?**: `string`

The identity of the organization which controls the stream.

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The identity of the user who created the stream.

***

### proofId? {#proofid}

> `optional` **proofId?**: `string`

The id of the immutable proof for the stream.

***

### numberOfItems? {#numberofitems}

> `optional` **numberOfItems?**: `number`

How many entries are in the stream.

***

### entries? {#entries}

> `optional` **entries?**: `object`

Entries in the stream.

#### type

> **type**: `"ItemList"`

#### itemListElement

> **itemListElement**: [`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)[]

#### Overrides

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`entries`](IAuditableItemStreamBase.md#entries)

***

### verification? {#verification}

> `optional` **verification?**: `IImmutableProofVerification`

The verification of the stream.

***

### @context {#context}

> **@context**: \[`"https://schema.org"`, `"https://schema.3sixty.global/ais/"`, `"https://schema.3sixty.global/common/"`, `...IJsonLdContextDefinitionElement[]`\]

JSON-LD Context.

#### Inherited from

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`@context`](IAuditableItemStreamBase.md#context)

***

### type {#type}

> **type**: `"AuditableItemStream"`

JSON-LD Type.

#### Inherited from

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`type`](IAuditableItemStreamBase.md#type)

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

The object to associate with the entry as JSON-LD.

#### Inherited from

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`annotationObject`](IAuditableItemStreamBase.md#annotationobject)

***

### immutableInterval? {#immutableinterval}

> `optional` **immutableInterval?**: `number`

After how many entries do we add immutable checks, defaults to service configured value.
A value of 0 will disable immutable checks, 1 will be every item, or any other integer for an interval.

#### Inherited from

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`immutableInterval`](IAuditableItemStreamBase.md#immutableinterval)

***

### closed? {#closed}

> `optional` **closed?**: `boolean`

Is the stream closed for entry updates.

#### Inherited from

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`closed`](IAuditableItemStreamBase.md#closed)

***

### mode? {#mode}

> `optional` **mode?**: [`AuditableItemStreamModes`](../type-aliases/AuditableItemStreamModes.md)

The operation mode for the stream.

#### Inherited from

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md).[`mode`](IAuditableItemStreamBase.md#mode)

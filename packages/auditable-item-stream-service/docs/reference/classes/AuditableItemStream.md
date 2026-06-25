# Class: AuditableItemStream

Class describing the auditable item stream.

## Constructors

### Constructor

> **new AuditableItemStream**(): `AuditableItemStream`

#### Returns

`AuditableItemStream`

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

### organizationIdentity {#organizationidentity}

> **organizationIdentity**: `string`

The identity of the organization which controls the stream.

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The identity of the user which created the stream.

***

### annotationObject? {#annotationobject}

> `optional` **annotationObject?**: `IJsonLdNodeObject`

Object to associate with the stream as JSON-LD.

***

### numberOfItems {#numberofitems}

> **numberOfItems**: `number`

The number of items in the stream.

***

### immutableInterval {#immutableinterval}

> **immutableInterval**: `number`

After how many entries do we add immutable checks.

***

### closed? {#closed}

> `optional` **closed?**: `boolean`

Is the stream closed for entry updates.

***

### mode? {#mode}

> `optional` **mode?**: `AuditableItemStreamModes`

The operation mode for the stream.

***

### proofId? {#proofid}

> `optional` **proofId?**: `string`

The immutable proof id.

# Class: AuditableItemStreamEntry

Class describing the auditable item stream entry.

## Constructors

### Constructor

> **new AuditableItemStreamEntry**(): `AuditableItemStreamEntry`

#### Returns

`AuditableItemStreamEntry`

## Properties

### id {#id}

> **id**: `string`

The id of the entry.

***

### streamId {#streamid}

> **streamId**: `string`

The stream that the entry belongs to.

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

The identity of the user that added the entry.

***

### entryObject {#entryobject}

> **entryObject**: `IJsonLdNodeObject`

Object to associate with the entry as JSON-LD.

***

### index {#index}

> **index**: `number`

The index of the entry in the stream.

***

### proofId? {#proofid}

> `optional` **proofId?**: `string`

The immutable proof id.

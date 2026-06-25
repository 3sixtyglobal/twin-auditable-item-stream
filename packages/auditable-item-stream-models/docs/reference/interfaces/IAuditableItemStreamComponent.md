# Interface: IAuditableItemStreamComponent

Interface describing an auditable item stream component.

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`stream`): `Promise`\<`string`\>

Create a new stream.

#### Parameters

##### stream

[`IAuditableItemStreamBase`](IAuditableItemStreamBase.md)

The stream to create.

#### Returns

`Promise`\<`string`\>

The id of the created stream, if not provided.

***

### update() {#update}

> **update**(`stream`): `Promise`\<`void`\>

Update a stream.

#### Parameters

##### stream

`Pick`\<[`IAuditableItemStream`](IAuditableItemStream.md), `"@context"` \| `"type"` \| `"id"` \| `"annotationObject"`\>

The stream to update, does not update entries.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the stream has been updated.

***

### close() {#close}

> **close**(`id`): `Promise`\<`void`\>

Close a stream.

#### Parameters

##### id

`string`

The id of the stream to close.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the stream has been closed.

***

### get() {#get}

> **get**(`id`, `cursor?`, `limit?`, `options?`): `Promise`\<\{ `stream`: [`IAuditableItemStream`](IAuditableItemStream.md); `cursor?`: `string`; \}\>

Get a stream header without the entries.

#### Parameters

##### id

`string`

The id of the stream to get.

##### cursor?

`string`

Cursor to use for next chunk of entries.

##### limit?

`number`

Limit the number of entries to return, only applicable if includeEntries is true.

##### options?

Additional options for the get operation.

###### includeEntries?

`boolean`

Whether to include the entries, defaults to false.

###### includeDeleted?

`boolean`

Whether to include deleted entries, defaults to false.

###### verifyStream?

`boolean`

Should the stream be verified, defaults to false.

###### verifyEntries?

`boolean`

Should the entries be verified, defaults to false.

#### Returns

`Promise`\<\{ `stream`: [`IAuditableItemStream`](IAuditableItemStream.md); `cursor?`: `string`; \}\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Delete the stream.

#### Parameters

##### id

`string`

The id of the stream to remove.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the stream has been removed.

***

### query() {#query}

> **query**(`conditions?`, `orderBy?`, `orderByDirection?`, `properties?`, `cursor?`, `limit?`): `Promise`\<\{ `entries`: [`IAuditableItemStreamList`](IAuditableItemStreamList.md); `cursor?`: `string`; \}\>

Query all the streams, will not return entries.

#### Parameters

##### conditions?

`IComparator`[]

Conditions to use in the query.

##### orderBy?

`"dateCreated"` \| `"dateModified"`

The order for the results, defaults to created.

##### orderByDirection?

`SortDirection`

The direction for the order, defaults to descending.

##### properties?

keyof [`IAuditableItemStream`](IAuditableItemStream.md)[]

The properties to return, if not provided defaults to id, dateCreated, dateModified and annotationObject.

##### cursor?

`string`

The cursor to request the next chunk of entities.

##### limit?

`number`

Limit the number of entities to return.

#### Returns

`Promise`\<\{ `entries`: [`IAuditableItemStreamList`](IAuditableItemStreamList.md); `cursor?`: `string`; \}\>

The entities, which can be partial if a limited keys list was provided.

***

### createEntry() {#createentry}

> **createEntry**(`streamId`, `entryObject`): `Promise`\<`string`\>

Create an entry in the stream.

#### Parameters

##### streamId

`string`

The id of the stream to create the entry in.

##### entryObject

`IJsonLdNodeObject`

The object for the stream as JSON-LD.

#### Returns

`Promise`\<`string`\>

The id of the created entry, if not provided.

***

### getEntry() {#getentry}

> **getEntry**(`streamId`, `entryId`, `options?`): `Promise`\<[`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)\>

Get the entry from the stream.

#### Parameters

##### streamId

`string`

The id of the stream to get.

##### entryId

`string`

The id of the stream entry to get.

##### options?

Additional options for the get operation.

###### verifyEntry?

`boolean`

Should the entry be verified, defaults to false.

#### Returns

`Promise`\<[`IAuditableItemStreamEntry`](IAuditableItemStreamEntry.md)\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

***

### getEntryObject() {#getentryobject}

> **getEntryObject**(`id`, `entryId`): `Promise`\<`IJsonLdNodeObject`\>

Get the entry object from the stream.

#### Parameters

##### id

`string`

The id of the stream to get.

##### entryId

`string`

The id of the stream entry to get.

#### Returns

`Promise`\<`IJsonLdNodeObject`\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

***

### updateEntry() {#updateentry}

> **updateEntry**(`streamId`, `entryId`, `entryObject`): `Promise`\<`void`\>

Update an entry in the stream.

#### Parameters

##### streamId

`string`

The id of the stream to update.

##### entryId

`string`

The id of the entry to update.

##### entryObject

`IJsonLdNodeObject`

The object for the entry as JSON-LD.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the entry has been updated.

***

### removeEntry() {#removeentry}

> **removeEntry**(`streamId`, `entryId`): `Promise`\<`void`\>

Remove from the stream.

#### Parameters

##### streamId

`string`

The id of the stream to remove from.

##### entryId

`string`

The id of the entry to delete.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the entry has been removed.

***

### getEntries() {#getentries}

> **getEntries**(`streamId?`, `options?`): `Promise`\<\{ `entries`: [`IAuditableItemStreamEntryList`](IAuditableItemStreamEntryList.md); `cursor?`: `string`; \}\>

Get the entries for the stream.

#### Parameters

##### streamId?

`string`

The id of the stream to get, if undefined returns all matching entries.

##### options?

Additional options for the get operation.

###### conditions?

`IComparator`[]

The conditions to filter the stream.

###### includeDeleted?

`boolean`

Whether to include deleted entries, defaults to false.

###### verifyEntries?

`boolean`

Should the entries be verified, defaults to false.

###### limit?

`number`

How many entries to return.

###### cursor?

`string`

Cursor to use for next chunk of data.

###### order?

`SortDirection`

Retrieve the entries in ascending/descending time order, defaults to Ascending.

#### Returns

`Promise`\<\{ `entries`: [`IAuditableItemStreamEntryList`](IAuditableItemStreamEntryList.md); `cursor?`: `string`; \}\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

***

### getEntryObjects() {#getentryobjects}

> **getEntryObjects**(`streamId?`, `options?`): `Promise`\<\{ `entries`: [`IAuditableItemStreamEntryObjectList`](IAuditableItemStreamEntryObjectList.md); `cursor?`: `string`; \}\>

Get the entry objects for the stream.

#### Parameters

##### streamId?

`string`

The id of the stream to get, if undefined returns all matching entries.

##### options?

Additional options for the get operation.

###### conditions?

`IComparator`[]

The conditions to filter the stream.

###### includeDeleted?

`boolean`

Whether to include deleted entries, defaults to false.

###### limit?

`number`

How many entries to return.

###### cursor?

`string`

Cursor to use for next chunk of data.

###### order?

`SortDirection`

Retrieve the entries in ascending/descending time order, defaults to Ascending.

#### Returns

`Promise`\<\{ `entries`: [`IAuditableItemStreamEntryObjectList`](IAuditableItemStreamEntryObjectList.md); `cursor?`: `string`; \}\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

***

### removeProof() {#removeproof}

> **removeProof**(`streamId`): `Promise`\<`void`\>

Remove the proof for the stream and entries.

#### Parameters

##### streamId

`string`

The id of the stream to remove the proof from.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the proof has been removed.

#### Throws

NotFoundError if the vertex is not found.

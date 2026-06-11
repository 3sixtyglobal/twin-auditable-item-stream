# Class: AuditableItemStreamRestClient

Client for performing auditable item stream through to REST endpoints.

## Extends

- `BaseRestClient`

## Implements

- `IAuditableItemStreamComponent`

## Constructors

### Constructor

> **new AuditableItemStreamRestClient**(`config`): `AuditableItemStreamRestClient`

Create a new instance of AuditableItemStreamRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`AuditableItemStreamRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuditableItemStreamComponent.className`

***

### create() {#create}

> **create**(`stream`): `Promise`\<`string`\>

Create a new stream.

#### Parameters

##### stream

`IAuditableItemStreamBase`

The stream to create.

#### Returns

`Promise`\<`string`\>

The id of the new stream item.

#### Implementation of

`IAuditableItemStreamComponent.create`

***

### get() {#get}

> **get**(`id`, `cursor?`, `limit?`, `options?`): `Promise`\<\{ `stream`: `IAuditableItemStream`; `cursor?`: `string`; \}\>

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

`Promise`\<\{ `stream`: `IAuditableItemStream`; `cursor?`: `string`; \}\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found

#### Implementation of

`IAuditableItemStreamComponent.get`

***

### update() {#update}

> **update**(`stream`): `Promise`\<`void`\>

Update a stream.

#### Parameters

##### stream

`Pick`\<`IAuditableItemStream`, `"@context"` \| `"type"` \| `"id"` \| `"annotationObject"`\>

The stream to update, does not update entries.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.update`

***

### close() {#close}

> **close**(`id`): `Promise`\<`void`\>

Close the stream.

#### Parameters

##### id

`string`

The id of the stream to close.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.close`

***

### removeProof() {#removeproof}

> **removeProof**(`streamId`): `Promise`\<`void`\>

Remove the notarization proof from a stream.

#### Parameters

##### streamId

`string`

The id of the stream.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.removeProof`

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

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.remove`

***

### query() {#query}

> **query**(`conditions?`, `orderBy?`, `orderByDirection?`, `properties?`, `cursor?`, `limit?`): `Promise`\<\{ `entries`: `IAuditableItemStreamList`; `cursor?`: `string`; \}\>

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

keyof `IAuditableItemStream`[]

The properties to return, if not provided defaults to id, created and object.

##### cursor?

`string`

The cursor to request the next chunk of entities.

##### limit?

`number`

Limit the number of entities to return.

#### Returns

`Promise`\<\{ `entries`: `IAuditableItemStreamList`; `cursor?`: `string`; \}\>

The entities, which can be partial if a limited keys list was provided.

#### Implementation of

`IAuditableItemStreamComponent.query`

***

### createEntry() {#createentry}

> **createEntry**(`id`, `entryObject`): `Promise`\<`string`\>

Create an entry in the stream.

#### Parameters

##### id

`string`

The id of the stream to update.

##### entryObject

`IJsonLdNodeObject`

The object for the stream as JSON-LD.

#### Returns

`Promise`\<`string`\>

The id of the created entry, if not provided.

#### Implementation of

`IAuditableItemStreamComponent.createEntry`

***

### getEntry() {#getentry}

> **getEntry**(`id`, `entryId`, `options?`): `Promise`\<`IAuditableItemStreamEntry`\>

Get the entry from the stream.

#### Parameters

##### id

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

`Promise`\<`IAuditableItemStreamEntry`\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

#### Implementation of

`IAuditableItemStreamComponent.getEntry`

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

#### Implementation of

`IAuditableItemStreamComponent.getEntryObject`

***

### updateEntry() {#updateentry}

> **updateEntry**(`id`, `entryId`, `entryObject`): `Promise`\<`void`\>

Update an entry in the stream.

#### Parameters

##### id

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

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.updateEntry`

***

### removeEntry() {#removeentry}

> **removeEntry**(`id`, `entryId`): `Promise`\<`void`\>

Remove from the stream.

#### Parameters

##### id

`string`

The id of the stream to remove from.

##### entryId

`string`

The id of the entry to remove.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuditableItemStreamComponent.removeEntry`

***

### getEntries() {#getentries}

> **getEntries**(`id?`, `options?`): `Promise`\<\{ `entries`: `IAuditableItemStreamEntryList`; `cursor?`: `string`; \}\>

Get the entries for the stream.

#### Parameters

##### id?

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

`Promise`\<\{ `entries`: `IAuditableItemStreamEntryList`; `cursor?`: `string`; \}\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

#### Implementation of

`IAuditableItemStreamComponent.getEntries`

***

### getEntryObjects() {#getentryobjects}

> **getEntryObjects**(`id?`, `options?`): `Promise`\<\{ `entries`: `IAuditableItemStreamEntryObjectList`; `cursor?`: `string`; \}\>

Get the entry objects for the stream.

#### Parameters

##### id?

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

`Promise`\<\{ `entries`: `IAuditableItemStreamEntryObjectList`; `cursor?`: `string`; \}\>

The stream and entries if found.

#### Throws

NotFoundError if the stream is not found.

#### Implementation of

`IAuditableItemStreamComponent.getEntryObjects`

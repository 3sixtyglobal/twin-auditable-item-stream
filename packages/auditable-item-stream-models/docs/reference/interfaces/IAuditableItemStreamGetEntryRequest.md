# Interface: IAuditableItemStreamGetEntryRequest

Get an entry in the auditable item stream.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

The headers which can be used to determine the response data type.

#### accept

> **accept**: `"application/json"` \| `"application/ld+json"`

***

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### id

> **id**: `string`

The id of the stream to get the entry from.

#### entryId

> **entryId**: `string`

The id of the entry to get.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters.

#### verifyEntry?

> `optional` **verifyEntry?**: `string`

Verify the entry, defaults to false.

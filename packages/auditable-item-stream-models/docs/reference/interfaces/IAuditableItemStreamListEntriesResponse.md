# Interface: IAuditableItemStreamListEntriesResponse

Response to getting an auditable item stream entries.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

The headers which can be used to determine the response data type.

#### content-type

> **content-type**: `"application/json"` \| `"application/ld+json"`

#### link?

> `optional` **link?**: `string` \| `string`[]

***

### body {#body}

> **body**: [`IAuditableItemStreamEntryList`](IAuditableItemStreamEntryList.md)

The response body.

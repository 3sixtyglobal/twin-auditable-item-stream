# Interface: IAuditableItemStreamListEntryObjectsResponse

Response to getting an auditable item stream entries objects.

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

> **body**: [`IAuditableItemStreamEntryObjectList`](IAuditableItemStreamEntryObjectList.md)

The response body.

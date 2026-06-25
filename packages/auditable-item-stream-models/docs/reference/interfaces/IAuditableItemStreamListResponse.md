# Interface: IAuditableItemStreamListResponse

The response to getting the a list of the streams.

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

> **body**: [`IAuditableItemStreamList`](IAuditableItemStreamList.md)

The response payload.

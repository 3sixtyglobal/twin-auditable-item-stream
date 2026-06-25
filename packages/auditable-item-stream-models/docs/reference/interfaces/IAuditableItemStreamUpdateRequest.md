# Interface: IAuditableItemStreamUpdateRequest

Update an auditable item stream.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### id

> **id**: `string`

The id of the stream to update.

***

### body {#body}

> **body**: `Pick`\<[`IAuditableItemStream`](IAuditableItemStream.md), `"@context"` \| `"type"` \| `"annotationObject"`\>

The data to be used in the stream, entries should be updated separately.

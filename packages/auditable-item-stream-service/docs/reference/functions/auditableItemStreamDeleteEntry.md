# Function: auditableItemStreamDeleteEntry()

> **auditableItemStreamDeleteEntry**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Delete an entry from the stream.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditableItemStreamDeleteEntryRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.

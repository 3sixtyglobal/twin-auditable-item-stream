# Function: auditableItemStreamClose()

> **auditableItemStreamClose**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Close the stream.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditableItemStreamCloseRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.

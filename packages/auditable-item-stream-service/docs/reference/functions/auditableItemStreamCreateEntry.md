# Function: auditableItemStreamCreateEntry()

> **auditableItemStreamCreateEntry**(`httpRequestContext`, `componentName`, `request`, `baseRouteName`): `Promise`\<`ICreatedResponse`\>

Create the stream entry.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditableItemStreamCreateEntryRequest`

The request.

### baseRouteName

`string`

The base route name for the API.

## Returns

`Promise`\<`ICreatedResponse`\>

The response object with additional http response properties.

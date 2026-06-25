# Interface: IAuditableItemStreamServiceConstructorOptions

Options for the auditable item stream service constructor.

## Properties

### immutableProofComponentType? {#immutableproofcomponenttype}

> `optional` **immutableProofComponentType?**: `string`

The immutable proof component type.

#### Default

```ts
immutable-proof
```

***

### streamEntityStorageType? {#streamentitystoragetype}

> `optional` **streamEntityStorageType?**: `string`

The entity storage for stream.

#### Default

```ts
auditable-item-stream
```

***

### streamEntryEntityStorageType? {#streamentryentitystoragetype}

> `optional` **streamEntryEntityStorageType?**: `string`

The entity storage for stream entries.

#### Default

```ts
auditable-item-stream-entry
```

***

### eventBusComponentType? {#eventbuscomponenttype}

> `optional` **eventBusComponentType?**: `string`

The event bus component type, defaults to no event bus.

***

### telemetryComponentType? {#telemetrycomponenttype}

> `optional` **telemetryComponentType?**: `string`

The component type for the optional telemetry component used for event metrics.

***

### config? {#config}

> `optional` **config?**: [`IAuditableItemStreamServiceConfig`](IAuditableItemStreamServiceConfig.md)

The configuration for the connector.

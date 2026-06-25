# Auditable Item Stream Service Examples

Use these examples to wire the service with your storage components and run full stream and entry lifecycles.

## AuditableItemStreamService

```typescript
import { AuditableItemStreamService, initSchema } from '@twin.org/auditable-item-stream-service';

initSchema();

const service = new AuditableItemStreamService({
  immutableProofComponentType: 'immutable-proof',
  streamEntityStorageType: 'auditable-item-stream',
  streamEntryEntityStorageType: 'auditable-item-stream-entry'
});

console.log(service.className()); // AuditableItemStreamService
```

```typescript
import { AuditableItemStreamService } from '@twin.org/auditable-item-stream-service';

const service = new AuditableItemStreamService({
  immutableProofComponentType: 'immutable-proof',
  streamEntityStorageType: 'auditable-item-stream',
  streamEntryEntityStorageType: 'auditable-item-stream-entry'
});

const streamId = await service.create(
  {
    annotationObject: {
      '@context': 'https://schema.org',
      '@type': 'Project',
      name: 'Quarterly Assurance'
    },
    entries: [
      {
        entryObject: {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: 'Project opened'
        }
      }
    ]
  },
  {
    immutableInterval: 3
  }
);

const stream = await service.get(streamId, {
  includeEntries: true,
  verifyStream: true,
  verifyEntries: true
});

await service.update({
  id: streamId,
  annotationObject: {
    '@context': 'https://schema.org',
    '@type': 'Project',
    name: 'Quarterly Assurance Updated'
  }
});

console.log(stream.id); // ais:...
console.log(stream.numberOfItems); // 1
```

```typescript
import { AuditableItemStreamService } from '@twin.org/auditable-item-stream-service';
import { ComparisonOperator, SortDirection } from '@twin.org/entity';

const service = new AuditableItemStreamService({
  immutableProofComponentType: 'immutable-proof',
  streamEntityStorageType: 'auditable-item-stream',
  streamEntryEntityStorageType: 'auditable-item-stream-entry'
});

const streams = await service.query(
  [
    {
      property: 'organizationIdentity',
      comparison: ComparisonOperator.Equals,
      value: 'did:iota:org:123'
    }
  ],
  'dateCreated',
  SortDirection.Descending,
  ['id', 'dateCreated', 'dateModified', 'numberOfItems'],
  'cursor:page-1',
  10
);

const entries = await service.getEntries('ais:0f4f9de65dc44f31b4a474a0cc93ce69', {
  includeDeleted: false,
  verifyEntries: true,
  limit: 10,
  order: SortDirection.Ascending
});

const entryObjects = await service.getEntryObjects('ais:0f4f9de65dc44f31b4a474a0cc93ce69', {
  includeDeleted: true,
  limit: 10,
  order: SortDirection.Descending
});

console.log(streams.entries.itemListElement.length); // 10
console.log(entries.entries.itemListElement.length); // 10
console.log(entryObjects.entries.itemListElement.length); // 10
```

```typescript
import { AuditableItemStreamService } from '@twin.org/auditable-item-stream-service';

const service = new AuditableItemStreamService({
  immutableProofComponentType: 'immutable-proof',
  streamEntityStorageType: 'auditable-item-stream',
  streamEntryEntityStorageType: 'auditable-item-stream-entry'
});

const streamId = 'ais:0f4f9de65dc44f31b4a474a0cc93ce69';

const entryId = await service.createEntry(streamId, {
  '@context': 'https://schema.org',
  '@type': 'Message',
  text: 'The item passed validation'
});

const entry = await service.getEntry(streamId, entryId, {
  verifyEntry: true
});

const entryObject = await service.getEntryObject(streamId, entryId);

await service.updateEntry(streamId, entryId, {
  '@context': 'https://schema.org',
  '@type': 'Message',
  text: 'The item passed validation and was approved'
});

await service.removeEntry(streamId, entryId);

console.log(entry.id); // ais:0f4f9de65dc44f31b4a474a0cc93ce69:...
console.log(entryObject['@type']); // Message
```

```typescript
import { AuditableItemStreamService } from '@twin.org/auditable-item-stream-service';

const service = new AuditableItemStreamService({
  immutableProofComponentType: 'immutable-proof',
  streamEntityStorageType: 'auditable-item-stream',
  streamEntryEntityStorageType: 'auditable-item-stream-entry'
});

const streamId = 'ais:0f4f9de65dc44f31b4a474a0cc93ce69';

await service.removeVerifiable(streamId);
await service.remove(streamId);

console.log(streamId); // ais:0f4f9de65dc44f31b4a474a0cc93ce69
```

## AuditableItemStream

```typescript
import { AuditableItemStream } from '@twin.org/auditable-item-stream-service';

const streamEntity = new AuditableItemStream();
streamEntity.id = '0f4f9de65dc44f31b4a474a0cc93ce69';
streamEntity.dateCreated = '2026-03-10T09:00:00.000Z';
streamEntity.dateModified = '2026-03-10T09:05:00.000Z';
streamEntity.organizationIdentity = 'did:iota:org:123';
streamEntity.userIdentity = 'did:iota:user:456';
streamEntity.numberOfItems = 2;
streamEntity.immutableInterval = 5;

console.log(streamEntity.id); // 0f4f9de65dc44f31b4a474a0cc93ce69
console.log(streamEntity.numberOfItems); // 2
```

## AuditableItemStreamEntry

```typescript
import { AuditableItemStreamEntry } from '@twin.org/auditable-item-stream-service';

const streamEntryEntity = new AuditableItemStreamEntry();
streamEntryEntity.id = '1c7dd4e0e2a6428fa2d9b8f02fd5ce39';
streamEntryEntity.streamId = '0f4f9de65dc44f31b4a474a0cc93ce69';
streamEntryEntity.dateCreated = '2026-03-10T09:02:00.000Z';
streamEntryEntity.index = 1;
streamEntryEntity.entryObject = {
  '@context': 'https://schema.org',
  '@type': 'Message',
  text: 'Second event in the stream'
};

console.log(streamEntryEntity.id); // 1c7dd4e0e2a6428fa2d9b8f02fd5ce39
console.log(streamEntryEntity.index); // 1
```

## Schema Initialisation

```typescript
import { initSchema } from '@twin.org/auditable-item-stream-service';

initSchema();
console.log('Entity schemas registered'); // Entity schemas registered
```

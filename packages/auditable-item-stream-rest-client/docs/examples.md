# Auditable Item Stream REST Client Examples

These snippets show practical client-side workflows for creating streams, managing entries, and paging through results.

## AuditableItemStreamRestClient

```typescript
import { AuditableItemStreamRestClient } from '@3sixty/auditable-item-stream-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-models';

const config: IBaseRestClientConfig = {
  endpoint: 'http://localhost:3000'
};

const client = new AuditableItemStreamRestClient(config);
console.log(client.className()); // AuditableItemStreamRestClient
```

```typescript
import { AuditableItemStreamRestClient } from '@3sixty/auditable-item-stream-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-models';

const config: IBaseRestClientConfig = {
  endpoint: 'http://localhost:3000'
};

const client = new AuditableItemStreamRestClient(config);

const streamId = await client.create(
  {
    annotationObject: {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Monthly Compliance Report'
    },
    entries: [
      {
        entryObject: {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: 'Report created'
        }
      }
    ]
  },
  {
    immutableInterval: 5
  }
);

const stream = await client.get(streamId, {
  includeEntries: true,
  verifyStream: true,
  verifyEntries: true
});

await client.update({
  id: streamId,
  annotationObject: {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: 'Monthly Compliance Report v2'
  }
});

console.log(stream.id); // ais:...
console.log(stream.numberOfItems); // 1
```

```typescript
import { AuditableItemStreamRestClient } from '@3sixty/auditable-item-stream-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-models';
import { ComparisonOperator, SortDirection } from '@3sixty/entity';

const config: IBaseRestClientConfig = {
  endpoint: 'http://localhost:3000'
};

const client = new AuditableItemStreamRestClient(config);

const firstPage = await client.query(
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

console.log(firstPage.entries.itemListElement.length); // 10
console.log(firstPage.cursor); // eyJjdXJzb3IiOiIuLi4ifQ==
```

```typescript
import { AuditableItemStreamRestClient } from '@3sixty/auditable-item-stream-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-models';

const config: IBaseRestClientConfig = {
  endpoint: 'http://localhost:3000'
};

const client = new AuditableItemStreamRestClient(config);
const streamId = 'ais:0f4f9de65dc44f31b4a474a0cc93ce69';

const entryId = await client.createEntry(streamId, {
  '@context': 'https://schema.org',
  '@type': 'Message',
  text: 'Status changed to approved'
});

const entry = await client.getEntry(streamId, entryId, {
  verifyEntry: true
});

await client.updateEntry(streamId, entryId, {
  '@context': 'https://schema.org',
  '@type': 'Message',
  text: 'Status changed to approved by reviewer'
});

const entryObject = await client.getEntryObject(streamId, entryId);
console.log(entry.id); // ais:0f4f9de65dc44f31b4a474a0cc93ce69:...
console.log(entryObject['@type']); // Message

await client.removeEntry(streamId, entryId);
```

```typescript
import { AuditableItemStreamRestClient } from '@3sixty/auditable-item-stream-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-models';
import { SortDirection } from '@3sixty/entity';

const config: IBaseRestClientConfig = {
  endpoint: 'http://localhost:3000'
};

const client = new AuditableItemStreamRestClient(config);
const streamId = 'ais:0f4f9de65dc44f31b4a474a0cc93ce69';

const entryList = await client.getEntries(streamId, {
  includeDeleted: false,
  verifyEntries: false,
  limit: 20,
  order: SortDirection.Ascending
});

const entryObjectList = await client.getEntryObjects(streamId, {
  includeDeleted: true,
  limit: 20,
  order: SortDirection.Descending
});

console.log(entryList.entries.itemListElement.length); // 20
console.log(entryObjectList.entries.itemListElement.length); // 20
```

```typescript
import { AuditableItemStreamRestClient } from '@3sixty/auditable-item-stream-rest-client';
import type { IBaseRestClientConfig } from '@3sixty/api-models';

const config: IBaseRestClientConfig = {
  endpoint: 'http://localhost:3000'
};

const client = new AuditableItemStreamRestClient(config);
const streamId = 'ais:0f4f9de65dc44f31b4a474a0cc93ce69';

try {
  await client.removeVerifiable(streamId);
} catch (error) {
  if (error instanceof Error) {
    console.log(error.name); // NotSupportedError
  }
}

await client.remove(streamId);
```

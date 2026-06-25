# Auditable Item Stream Models Examples

Use these examples when you want to initialise the shared data type handlers before reading or validating stream payloads.

## AuditableItemStreamDataTypes

```typescript
import { AuditableItemStreamDataTypes } from '@twin.org/auditable-item-stream-models';

AuditableItemStreamDataTypes.registerTypes();
console.log('Data types registered'); // Data types registered
```

```typescript
import {
  AuditableItemStreamContexts,
  AuditableItemStreamDataTypes,
  AuditableItemStreamTypes
} from '@twin.org/auditable-item-stream-models';

AuditableItemStreamDataTypes.registerTypes();

const streamTypeId = `${AuditableItemStreamContexts.Namespace}${AuditableItemStreamTypes.Stream}`;
const entryTypeId = `${AuditableItemStreamContexts.Namespace}${AuditableItemStreamTypes.StreamEntry}`;

console.log(streamTypeId.startsWith('http')); // true
console.log(entryTypeId.endsWith(AuditableItemStreamTypes.StreamEntry)); // true
```

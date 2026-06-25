# Variable: AuditableItemStreamModes

> `const` **AuditableItemStreamModes**: `object`

The modes for auditable item stream behaviour.

## Type Declaration

### Default {#default}

> `readonly` **Default**: `"default"` = `"default"`

Default mode allows full entry lifecycle operations.

### AppendOnly {#appendonly}

> `readonly` **AppendOnly**: `"append-only"` = `"append-only"`

Append-only mode allows adding entries but disallows updates and removals.

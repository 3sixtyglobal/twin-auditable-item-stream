# Variable: AuditableItemStreamMetricIds

> `const` **AuditableItemStreamMetricIds**: `object`

Metric IDs for the auditable item stream service.

## Type Declaration

### StreamsCreated {#streamscreated}

> `readonly` **StreamsCreated**: `"ais_streams_created"` = `"ais_streams_created"`

Number of streams created.

### StreamsUpdated {#streamsupdated}

> `readonly` **StreamsUpdated**: `"ais_streams_updated"` = `"ais_streams_updated"`

Number of streams updated.

### StreamsClosed {#streamsclosed}

> `readonly` **StreamsClosed**: `"ais_streams_closed"` = `"ais_streams_closed"`

Number of streams closed.

### StreamsDeleted {#streamsdeleted}

> `readonly` **StreamsDeleted**: `"ais_streams_deleted"` = `"ais_streams_deleted"`

Number of streams deleted.

### EntriesCreated {#entriescreated}

> `readonly` **EntriesCreated**: `"ais_entries_created"` = `"ais_entries_created"`

Number of stream entries created.

### EntriesUpdated {#entriesupdated}

> `readonly` **EntriesUpdated**: `"ais_entries_updated"` = `"ais_entries_updated"`

Number of stream entries updated.

### EntriesDeleted {#entriesdeleted}

> `readonly` **EntriesDeleted**: `"ais_entries_deleted"` = `"ais_entries_deleted"`

Number of stream entries soft-deleted.

### ProofsCreatedStream {#proofscreatedstream}

> `readonly` **ProofsCreatedStream**: `"ais_proofs_created_stream"` = `"ais_proofs_created_stream"`

Number of stream-level proofs created.

### ProofsCreatedEntry {#proofscreatedentry}

> `readonly` **ProofsCreatedEntry**: `"ais_proofs_created_entry"` = `"ais_proofs_created_entry"`

Number of entry-level proofs created.

### ProofsRemovedStream {#proofsremovedstream}

> `readonly` **ProofsRemovedStream**: `"ais_proofs_removed_stream"` = `"ais_proofs_removed_stream"`

Number of stream-level proofs removed.

### ProofsRemovedEntry {#proofsremovedentry}

> `readonly` **ProofsRemovedEntry**: `"ais_proofs_removed_entry"` = `"ais_proofs_removed_entry"`

Number of entry-level proofs removed.

### AppendOnlyRejections {#appendonlyrejections}

> `readonly` **AppendOnlyRejections**: `"ais_append_only_rejections"` = `"ais_append_only_rejections"`

Number of write rejections due to AppendOnly mode.

### ClosedStreamRejections {#closedstreamrejections}

> `readonly` **ClosedStreamRejections**: `"ais_closed_stream_rejections"` = `"ais_closed_stream_rejections"`

Number of write rejections due to stream being closed.

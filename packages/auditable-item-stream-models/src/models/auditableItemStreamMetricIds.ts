// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Metric IDs for the auditable item stream service.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamMetricIds = {
	/**
	 * Number of streams created.
	 */
	StreamsCreated: "ais_streams_created",

	/**
	 * Number of streams updated.
	 */
	StreamsUpdated: "ais_streams_updated",

	/**
	 * Number of streams closed.
	 */
	StreamsClosed: "ais_streams_closed",

	/**
	 * Number of streams deleted.
	 */
	StreamsDeleted: "ais_streams_deleted",

	/**
	 * Number of stream entries created.
	 */
	EntriesCreated: "ais_entries_created",

	/**
	 * Number of stream entries updated.
	 */
	EntriesUpdated: "ais_entries_updated",

	/**
	 * Number of stream entries soft-deleted.
	 */
	EntriesDeleted: "ais_entries_deleted",

	/**
	 * Number of stream-level proofs created.
	 */
	ProofsCreatedStream: "ais_proofs_created_stream",

	/**
	 * Number of entry-level proofs created.
	 */
	ProofsCreatedEntry: "ais_proofs_created_entry",

	/**
	 * Number of stream-level proofs removed.
	 */
	ProofsRemovedStream: "ais_proofs_removed_stream",

	/**
	 * Number of entry-level proofs removed.
	 */
	ProofsRemovedEntry: "ais_proofs_removed_entry",

	/**
	 * Number of write rejections due to AppendOnly mode.
	 */
	AppendOnlyRejections: "ais_append_only_rejections",

	/**
	 * Number of write rejections due to stream being closed.
	 */
	ClosedStreamRejections: "ais_closed_stream_rejections"
} as const;

/**
 * Metric IDs for the auditable item stream service.
 */
export type AuditableItemStreamMetricIds =
	(typeof AuditableItemStreamMetricIds)[keyof typeof AuditableItemStreamMetricIds];

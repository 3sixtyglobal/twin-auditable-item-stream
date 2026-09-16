// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of auditable item stream data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamTypes = {
	/**
	 * Represents auditable item stream.
	 */
	Stream: "AuditableItemStream",

	/**
	 * Represents auditable item stream list.
	 */
	StreamList: "AuditableItemStreamList",

	/**
	 * Represents auditable item stream entry.
	 */
	StreamEntry: "AuditableItemStreamEntry",

	/**
	 * Represents auditable item stream entry list.
	 */
	StreamEntryList: "AuditableItemStreamEntryList",

	/**
	 * Represents auditable item stream entry object list.
	 */
	StreamEntryObjectList: "AuditableItemStreamEntryObjectList",

	/**
	 * Represents auditable item stream modes.
	 */
	StreamModes: "AuditableItemStreamModes"
} as const;

/**
 * The types of auditable item stream data.
 */
export type AuditableItemStreamTypes =
	(typeof AuditableItemStreamTypes)[keyof typeof AuditableItemStreamTypes];

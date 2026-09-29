// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The content of an opaque cursor for the auditable item stream service.
 */
export interface IAuditableItemStreamServiceCursor {
	/**
	 * The cursor from the entity storage.
	 */
	c: string;

	/**
	 * Should deleted entries be included.
	 */
	includeDeleted: boolean;
}

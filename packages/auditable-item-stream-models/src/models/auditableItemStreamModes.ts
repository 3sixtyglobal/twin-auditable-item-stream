// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The modes for auditable item stream behaviour.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamModes = {
	/**
	 * Default mode allows full entry lifecycle operations.
	 */
	Default: "default",

	/**
	 * Append-only mode allows adding entries but disallows updates and removals.
	 */
	AppendOnly: "append-only"
} as const;

/**
 * The modes for auditable item stream behaviour.
 */
export type AuditableItemStreamModes =
	(typeof AuditableItemStreamModes)[keyof typeof AuditableItemStreamModes];

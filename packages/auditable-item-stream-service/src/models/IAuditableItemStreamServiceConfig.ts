// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the auditable item stream service.
 */
export interface IAuditableItemStreamServiceConfig {
	/**
	 * After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable integrity checks, 1 will be every item, or any other integer for an interval.
	 * You can override this value on stream creation.
	 * @default 10
	 */
	defaultImmutableInterval?: number;

	/**
	 * The timeout in milliseconds to wait when acquiring a mutex lock, defaults to the Mutex default of 5000ms.
	 */
	mutexTimeoutMs?: number;
}

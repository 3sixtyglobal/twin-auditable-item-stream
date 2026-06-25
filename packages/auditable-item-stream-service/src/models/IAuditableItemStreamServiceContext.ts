// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IContextIds } from "@twin.org/context";

/**
 * Context for the auditable item stream service.
 */
export interface IAuditableItemStreamServiceContext {
	/**
	 * The current timestamp.
	 */
	now: string;

	/**
	 * The context ids for the operation.
	 */
	contextIds?: IContextIds;

	/**
	 * The index counter.
	 */
	indexCounter: number;

	/**
	 * The immutable check interval.
	 */
	immutableInterval: number;

	/**
	 * The identity of the organization which controls the stream.
	 */
	organizationIdentity: string;
}

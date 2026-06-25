// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Close an auditable item stream.
 */
export interface IAuditableItemStreamCloseRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to close.
		 */
		id: string;
	};
}

// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Remove the proof from an auditable item stream.
 */
export interface IAuditableItemStreamRemoveProofRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to remove the proof from.
		 */
		id: string;
	};
}

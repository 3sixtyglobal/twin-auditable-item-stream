// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemStream } from "../IAuditableItemStream.js";

/**
 * Update an auditable item stream.
 */
export interface IAuditableItemStreamUpdateRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to update.
		 */
		id: string;
	};

	/**
	 * The data to be used in the stream, entries should be updated separately.
	 */
	body: Pick<IAuditableItemStream, "@context" | "type" | "annotationObject">;
}

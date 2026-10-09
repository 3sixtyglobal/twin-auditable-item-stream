// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";

/**
 * Get an entry object in the auditable item stream.
 */
export interface IAuditableItemStreamGetEntryObjectRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to get the entry object from.
		 */
		id: string;

		/**
		 * The id of the entry to get.
		 */
		entryId: string;
	};
}

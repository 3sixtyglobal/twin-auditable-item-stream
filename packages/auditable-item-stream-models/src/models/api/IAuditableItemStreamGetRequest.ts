// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";

/**
 * Get an auditable item stream.
 */
export interface IAuditableItemStreamGetRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The parameters from the path.
	 */
	pathParams: {
		/**
		 * The id of the stream to get.
		 */
		id: string;
	};

	/**
	 * The parameters from the query.
	 */
	query?: {
		/**
		 * Cursor to use for next chunk of entries.
		 */
		cursor?: string;

		/**
		 * Limit the number of entries to return, only applicable if includeEntries is true.
		 */
		limit?: string;

		/**
		 * Whether to include the entries, defaults to false.
		 * The entries will be limited to the first page of entries in date descending order.
		 * If you want to get more entries you can use the returned cursor with the get entries method.
		 */
		includeEntries?: string;

		/**
		 * Whether to include deleted entries, defaults to false.
		 */
		includeDeleted?: string;

		/**
		 * Should the stream be verified, defaults to false.
		 */
		verifyStream?: string;

		/**
		 * Should the entries be verified, defaults to false.
		 */
		verifyEntries?: string;
	};
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SortDirection } from "@3sixty/entity";
import type { HeaderTypes, MimeTypes } from "@3sixty/web";

/**
 * Get an auditable item stream entry objects.
 */
export interface IAuditableItemStreamListEntryObjectsRequest {
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
	 * The query parameters.
	 */
	query?: {
		/**
		 * The conditions to filter the stream, JSON stringified `EntityCondition<IAuditableItemStreamEntry>`.
		 */
		conditions?: string;

		/**
		 * Whether to include deleted entries, defaults to false.
		 */
		includeDeleted?: string;

		/**
		 * Retrieve the entries in ascending/descending time order, defaults to Ascending.
		 */
		order?: SortDirection;

		/**
		 * How many entries to return.
		 */
		limit?: string;

		/**
		 * Cursor to use for next chunk of data.
		 */
		cursor?: string;
	};
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SortDirection } from "@twin.org/entity";
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemStream } from "../IAuditableItemStream.js";

/**
 * Get a list of the streams.
 */
export interface IAuditableItemStreamListRequest {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.Accept]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * The conditions to filter the streams, JSON stringified `EntityCondition<IAuditableItemStream>`.
		 */
		conditions?: string;

		/**
		 * The order for the results, default to created.
		 */
		orderBy?: keyof Pick<IAuditableItemStream, "dateCreated" | "dateModified">;

		/**
		 * The direction for the order, defaults to desc.
		 */
		orderByDirection?: SortDirection;

		/**
		 * The properties to return as a comma separated list, defaults to "id,object".
		 */
		properties?: string;

		/**
		 * The optional cursor to get next chunk.
		 */
		cursor?: string;

		/**
		 * Limit the number of entities to return.
		 */
		limit?: string;
	};
}

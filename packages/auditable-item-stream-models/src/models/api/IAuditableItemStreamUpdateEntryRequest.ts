// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";

/**
 * Update an entry in the auditable item stream.
 */
export interface IAuditableItemStreamUpdateEntryRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to update the entry in.
		 */
		id: string;

		/**
		 * The id of the entry to update.
		 */
		entryId: string;
	};

	/**
	 * The data to be used in the entry.
	 */
	body: {
		/**
		 * The object to be used in the entry as JSON-LD.
		 */
		entryObject: IJsonLdNodeObject;
	};
}

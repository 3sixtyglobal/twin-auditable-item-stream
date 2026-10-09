// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";

/**
 * Append to an auditable item stream.
 */
export interface IAuditableItemStreamCreateEntryRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the stream to create the entry in.
		 */
		id: string;
	};

	/**
	 * The data to be used in the stream.
	 */
	body: {
		/**
		 * The object to be used for the entry in the stream as JSON-LD.
		 */
		entryObject: IJsonLdNodeObject;
	};
}

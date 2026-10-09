// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";
import type { IAuditableItemStreamEntryList } from "../IAuditableItemStreamEntryList.js";

/**
 * Response to getting an auditable item stream entries.
 */
export interface IAuditableItemStreamListEntriesResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
		[HeaderTypes.Link]?: string | string[];
	};

	/**
	 * The response body.
	 */
	body: IAuditableItemStreamEntryList;
}

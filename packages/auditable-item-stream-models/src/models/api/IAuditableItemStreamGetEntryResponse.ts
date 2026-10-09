// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";
import type { IAuditableItemStreamEntry } from "../IAuditableItemStreamEntry.js";

/**
 * Response to getting an auditable item stream entry.
 */
export interface IAuditableItemStreamGetEntryResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body.
	 */
	body: IAuditableItemStreamEntry;
}

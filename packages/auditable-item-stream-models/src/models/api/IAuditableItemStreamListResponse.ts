// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";
import type { IAuditableItemStreamList } from "../IAuditableItemStreamList.js";

/**
 * The response to getting the a list of the streams.
 */
export interface IAuditableItemStreamListResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
		[HeaderTypes.Link]?: string | string[];
	};

	/**
	 * The response payload.
	 */
	body: IAuditableItemStreamList;
}

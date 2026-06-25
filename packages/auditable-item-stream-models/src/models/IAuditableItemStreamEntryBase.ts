// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes.js";

/**
 * Interface describing an entry for the stream.
 */
export interface IAuditableItemStreamEntryBase {
	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.StreamEntry;

	/**
	 * The object to associate with the entry as JSON-LD.
	 * @json-ld type:json
	 */
	entryObject: IJsonLdNodeObject;
}

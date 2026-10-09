// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@3sixty/standards-schema-org";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts.js";
import type { AuditableItemStreamModes } from "./auditableItemStreamModes.js";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes.js";
import type { IAuditableItemStreamEntryBase } from "./IAuditableItemStreamEntryBase.js";

/**
 * Interface describing an auditable item stream.
 */
export interface IAuditableItemStreamBase {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof SchemaOrgContexts.Context,
		typeof AuditableItemStreamContexts.Context,
		typeof AuditableItemStreamContexts.ContextCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemStreamTypes.Stream;

	/**
	 * The object to associate with the entry as JSON-LD.
	 * @json-ld namespace:twin-common
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * Entries in the stream.
	 * @json-ld container:set
	 */
	entries?: {
		type: typeof SchemaOrgTypes.ItemList;
		[SchemaOrgTypes.ItemListElement]: IAuditableItemStreamEntryBase[];
	};

	/**
	 * After how many entries do we add immutable checks, defaults to service configured value.
	 * A value of 0 will disable immutable checks, 1 will be every item, or any other integer for an interval.
	 * @json-ld type:sch:Integer
	 */
	immutableInterval?: number;

	/**
	 * Is the stream closed for entry updates.
	 * @json-ld type:sch:Boolean
	 */
	closed?: boolean;

	/**
	 * The operation mode for the stream.
	 * @json-ld type:sch:Text
	 */
	mode?: AuditableItemStreamModes;
}

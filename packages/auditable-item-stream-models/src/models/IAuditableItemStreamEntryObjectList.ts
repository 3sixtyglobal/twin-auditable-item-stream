// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@3sixty/standards-schema-org";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts.js";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes.js";

/**
 * Interface describing an auditable item stream entries object list.
 */
export interface IAuditableItemStreamEntryObjectList {
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
	type: [typeof SchemaOrgTypes.ItemList, typeof AuditableItemStreamTypes.StreamEntryObjectList];

	/**
	 * The entry objects in the stream.
	 * @json-ld namespace:sch
	 */
	[SchemaOrgTypes.ItemListElement]: IJsonLdNodeObject[];
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@3sixty/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@3sixty/standards-schema-org";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts.js";
import type { AuditableItemStreamTypes } from "./auditableItemStreamTypes.js";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry.js";

/**
 * Interface describing an auditable item stream entries list.
 */
export interface IAuditableItemStreamEntryList {
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
	type: [typeof SchemaOrgTypes.ItemList, typeof AuditableItemStreamTypes.StreamEntryList];

	/**
	 * The entries in the stream.
	 * @json-ld namespace:sch
	 */
	[SchemaOrgTypes.ItemListElement]: IAuditableItemStreamEntry[];
}

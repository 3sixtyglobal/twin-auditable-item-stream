// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHelper } from "@twin.org/data-core";
import { AuditableItemStreamContexts } from "../models/auditableItemStreamContexts.js";
import { AuditableItemStreamTypes } from "../models/auditableItemStreamTypes.js";
import AuditableItemStreamSchema from "../schemas/AuditableItemStream.json" with { type: "json" };
import AuditableItemStreamBaseSchema from "../schemas/AuditableItemStreamBase.json" with { type: "json" };
import AuditableItemStreamEntrySchema from "../schemas/AuditableItemStreamEntry.json" with { type: "json" };
import AuditableItemStreamEntryBaseSchema from "../schemas/AuditableItemStreamEntryBase.json" with { type: "json" };
import AuditableItemStreamEntryListSchema from "../schemas/AuditableItemStreamEntryList.json" with { type: "json" };
import AuditableItemStreamEntryObjectListSchema from "../schemas/AuditableItemStreamEntryObjectList.json" with { type: "json" };
import AuditableItemStreamListSchema from "../schemas/AuditableItemStreamList.json" with { type: "json" };
import AuditableItemStreamModesSchema from "../schemas/AuditableItemStreamModes.json" with { type: "json" };

/**
 * Handle all the data types for auditable item stream.
 */
export class AuditableItemStreamDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		const types = [
			{
				type: AuditableItemStreamTypes.Stream,
				schema: AuditableItemStreamSchema
			},
			{
				type: AuditableItemStreamTypes.StreamList,
				schema: AuditableItemStreamListSchema
			},
			{
				type: AuditableItemStreamTypes.StreamEntry,
				schema: AuditableItemStreamEntrySchema
			},
			{
				type: AuditableItemStreamTypes.StreamEntryList,
				schema: AuditableItemStreamEntryListSchema
			},
			{
				type: AuditableItemStreamTypes.StreamEntryObjectList,
				schema: AuditableItemStreamEntryObjectListSchema
			},
			{
				type: "AuditableItemStreamBase",
				schema: AuditableItemStreamBaseSchema
			},
			{
				type: "AuditableItemStreamEntryBase",
				schema: AuditableItemStreamEntryBaseSchema
			},
			{
				type: AuditableItemStreamTypes.StreamModes,
				schema: AuditableItemStreamModesSchema
			}
		];

		DataTypeHelper.registerTypes(
			AuditableItemStreamContexts.Namespace,
			AuditableItemStreamContexts.JsonLdContext,
			types.map(t => ({ type: t.type, schema: t.schema }))
		);
	}
}

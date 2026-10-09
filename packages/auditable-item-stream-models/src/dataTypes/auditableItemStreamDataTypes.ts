// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHelper } from "@3sixty/data-core";
import { JsonLdDataTypes } from "@3sixty/data-json-ld";
import { ImmutableProofDataTypes } from "@3sixty/immutable-proof-models";
import * as CompiledValidators from "../compiled/validators.js";
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
		// Register the types referenced by the schemas, which are only registered once.
		JsonLdDataTypes.registerTypes();
		ImmutableProofDataTypes.registerTypes();

		const types = [
			{
				type: AuditableItemStreamTypes.Stream,
				schema: AuditableItemStreamSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStream
			},
			{
				type: AuditableItemStreamTypes.StreamList,
				schema: AuditableItemStreamListSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamList
			},
			{
				type: AuditableItemStreamTypes.StreamEntry,
				schema: AuditableItemStreamEntrySchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamEntry
			},
			{
				type: AuditableItemStreamTypes.StreamEntryList,
				schema: AuditableItemStreamEntryListSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamEntryList
			},
			{
				type: AuditableItemStreamTypes.StreamEntryObjectList,
				schema: AuditableItemStreamEntryObjectListSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamEntryObjectList
			},
			{
				type: "AuditableItemStreamBase",
				schema: AuditableItemStreamBaseSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamBase
			},
			{
				type: "AuditableItemStreamEntryBase",
				schema: AuditableItemStreamEntryBaseSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamEntryBase
			},
			{
				type: AuditableItemStreamTypes.StreamModes,
				schema: AuditableItemStreamModesSchema,
				compiledValidator: CompiledValidators.CompiledAuditableItemStreamModes
			}
		];

		DataTypeHelper.registerTypes(
			AuditableItemStreamContexts.Namespace,
			AuditableItemStreamContexts.JsonLdContext,
			types
		);
	}
}

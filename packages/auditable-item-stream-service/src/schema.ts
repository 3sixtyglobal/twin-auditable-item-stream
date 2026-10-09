// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { AuditableItemStream } from "./entities/auditableItemStream.js";
import { AuditableItemStreamEntry } from "./entities/auditableItemStreamEntry.js";

/**
 * Initialize the schema for the auditable item stream entity storage connector.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuditableItemStream>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemStream)
	);
	EntitySchemaFactory.register(nameof<AuditableItemStreamEntry>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemStreamEntry)
	);
}

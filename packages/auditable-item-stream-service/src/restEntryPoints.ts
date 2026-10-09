// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import {
	generateRestRoutesAuditableItemStream,
	tagsAuditableItemStream
} from "./auditableItemStreamRoutes.js";

/**
 * The REST route entry points for the auditable item stream service.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "auditable-item-stream",
		defaultBaseRoute: "auditable-item-stream",
		tags: tagsAuditableItemStream,
		generateRoutes: generateRestRoutesAuditableItemStream
	}
];

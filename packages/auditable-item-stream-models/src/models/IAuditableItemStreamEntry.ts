// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@3sixty/data-json-ld";
import type { IImmutableProofVerification } from "@3sixty/immutable-proof-models";
import type { AuditableItemStreamContexts } from "./auditableItemStreamContexts.js";
import type { IAuditableItemStreamEntryBase } from "./IAuditableItemStreamEntryBase.js";

/**
 * Interface describing an entry for the stream.
 */
export interface IAuditableItemStreamEntry extends IAuditableItemStreamEntryBase {
	/**
	 * JSON-LD Context.
	 */
	"@context"?: [
		typeof AuditableItemStreamContexts.Context,
		typeof AuditableItemStreamContexts.ContextCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * The id of the entry.
	 */
	id: string;

	/**
	 * The date/time of when the entry was created.
	 * @json-ld namespace:sch
	 */
	dateCreated: string;

	/**
	 * The date/time of when the entry was modified.
	 * @json-ld namespace:sch
	 */
	dateModified?: string;

	/**
	 * The date/time of when the entry was deleted, as we never actually remove items.
	 * @json-ld namespace:sch
	 */
	dateDeleted?: string;

	/**
	 * The identity of the user which added the entry to the stream.
	 * @json-ld namespace:twin-common
	 */
	userIdentity?: string;

	/**
	 * The index of the entry in the stream.
	 * @json-ld type:sch:Integer
	 */
	index: number;

	/**
	 * The id of the immutable proof.
	 * @json-ld type:sch:identifier
	 */
	proofId?: string;

	/**
	 * The verification of the entry.
	 * @json-ld id
	 */
	verification?: IImmutableProofVerification;
}

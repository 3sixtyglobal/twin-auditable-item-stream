// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IImmutableProofVerification } from "@3sixty/immutable-proof-models";
import type { SchemaOrgTypes } from "@3sixty/standards-schema-org";
import type { IAuditableItemStreamBase } from "./IAuditableItemStreamBase.js";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry.js";

/**
 * Interface describing an auditable item stream.
 */
export interface IAuditableItemStream extends IAuditableItemStreamBase {
	/**
	 * The id of the stream.
	 */
	id: string;

	/**
	 * The date/time of when the stream was created.
	 * @json-ld namespace:sch
	 */
	dateCreated: string;

	/**
	 * The date/time of when the stream was modified.
	 * @json-ld namespace:sch
	 */
	dateModified?: string;

	/**
	 * The identity of the organization which controls the stream.
	 * @json-ld namespace:twin-common
	 */
	organizationIdentity?: string;

	/**
	 * The identity of the user who created the stream.
	 * @json-ld namespace:twin-common
	 */
	userIdentity?: string;

	/**
	 * The id of the immutable proof for the stream.
	 * @json-ld type:sch:identifier
	 */
	proofId?: string;

	/**
	 * How many entries are in the stream.
	 * @json-ld id:sch:numberOfItems
	 */
	numberOfItems?: number;

	/**
	 * Entries in the stream.
	 * @json-ld container:set
	 */
	entries?: {
		type: typeof SchemaOrgTypes.ItemList;
		[SchemaOrgTypes.ItemListElement]: IAuditableItemStreamEntry[];
	};

	/**
	 * The verification of the stream.
	 * @json-ld id
	 */
	verification?: IImmutableProofVerification;
}

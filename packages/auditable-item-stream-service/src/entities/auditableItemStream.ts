// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemStreamModes } from "@3sixty/auditable-item-stream-models";
import { type IJsonLdNodeObject, JsonLdTypes } from "@3sixty/data-json-ld";
import { entity, property, SortDirection } from "@3sixty/entity";

/**
 * Class describing the auditable item stream.
 */
@entity()
export class AuditableItemStream {
	/**
	 * The id of the stream.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The date/time of when the stream was created.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateCreated!: string;

	/**
	 * The date/time of when the stream was modified.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Descending,
		optional: true
	})
	public dateModified?: string;

	/**
	 * The identity of the organization which controls the stream.
	 */
	@property({ type: "string", maxLength: 255 })
	public organizationIdentity!: string;

	/**
	 * The identity of the user which created the stream.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public userIdentity?: string;

	/**
	 * Object to associate with the stream as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.Object, optional: true })
	public annotationObject?: IJsonLdNodeObject;

	/**
	 * The number of items in the stream.
	 */
	@property({ type: "integer" })
	public numberOfItems!: number;

	/**
	 * After how many entries do we add immutable checks.
	 */
	@property({ type: "integer" })
	public immutableInterval!: number;

	/**
	 * Is the stream closed for entry updates.
	 */
	@property({ type: "boolean", optional: true })
	public closed?: boolean;

	/**
	 * The operation mode for the stream.
	 */
	@property({ type: "string", maxLength: 16, optional: true })
	public mode?: AuditableItemStreamModes;

	/**
	 * The immutable proof id.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public proofId?: string;
}

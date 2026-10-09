// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { type IJsonLdNodeObject, JsonLdTypes } from "@3sixty/data-json-ld";
import { entity, property, SortDirection } from "@3sixty/entity";

/**
 * Class describing the auditable item stream entry.
 */
@entity()
export class AuditableItemStreamEntry {
	/**
	 * The id of the entry.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The stream that the entry belongs to.
	 */
	@property({ type: "string", maxLength: 255 })
	public streamId!: string;

	/**
	 * The date/time of when the entry was created.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Ascending })
	public dateCreated!: string;

	/**
	 * The date/time of when the entry was modified.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Descending,
		optional: true
	})
	public dateModified?: string;

	/**
	 * The date/time of when the entry was deleted, as we never actually remove items.
	 */
	@property({ type: "string", format: "date-time", optional: true })
	public dateDeleted?: string;

	/**
	 * The identity of the user that added the entry.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public userIdentity?: string;

	/**
	 * Object to associate with the entry as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.Object })
	public entryObject!: IJsonLdNodeObject;

	/**
	 * The index of the entry in the stream.
	 */
	@property({ type: "integer" })
	public index!: number;

	/**
	 * The immutable proof id.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public proofId?: string;
}

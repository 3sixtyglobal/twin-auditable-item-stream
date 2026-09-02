// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { EntityCondition, SortDirection } from "@twin.org/entity";
import type { IAuditableItemStream } from "./IAuditableItemStream.js";
import type { IAuditableItemStreamBase } from "./IAuditableItemStreamBase.js";
import type { IAuditableItemStreamEntry } from "./IAuditableItemStreamEntry.js";
import type { IAuditableItemStreamEntryList } from "./IAuditableItemStreamEntryList.js";
import type { IAuditableItemStreamEntryObjectList } from "./IAuditableItemStreamEntryObjectList.js";
import type { IAuditableItemStreamList } from "./IAuditableItemStreamList.js";

/**
 * Interface describing an auditable item stream component.
 */
export interface IAuditableItemStreamComponent extends IComponent {
	/**
	 * Create a new stream.
	 * @param stream The stream to create.
	 * @returns The id of the created stream, if not provided.
	 */
	create(stream: IAuditableItemStreamBase): Promise<string>;

	/**
	 * Update a stream.
	 * @param stream The stream to update, does not update entries.
	 * @returns A promise that resolves when the stream has been updated.
	 */
	update(
		stream: Pick<IAuditableItemStream, "@context" | "type" | "id" | "annotationObject">
	): Promise<void>;

	/**
	 * Close a stream.
	 * @param id The id of the stream to close.
	 * @returns A promise that resolves when the stream has been closed.
	 */
	close(id: string): Promise<void>;

	/**
	 * Get a stream header without the entries.
	 * @param id The id of the stream to get.
	 * @param cursor Cursor to use for next chunk of entries.
	 * @param limit Limit the number of entries to return, only applicable if includeEntries is true.
	 * @param options Additional options for the get operation.
	 * @param options.includeEntries Whether to include the entries, defaults to false.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.verifyStream Should the stream be verified, defaults to false.
	 * @param options.verifyEntries Should the entries be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	get(
		id: string,
		cursor?: string,
		limit?: number,
		options?: {
			includeEntries?: boolean;
			includeDeleted?: boolean;
			verifyStream?: boolean;
			verifyEntries?: boolean;
		}
	): Promise<{
		stream: IAuditableItemStream;
		cursor?: string;
	}>;

	/**
	 * Delete the stream.
	 * @param id The id of the stream to remove.
	 * @returns A promise that resolves when the stream has been removed.
	 */
	remove(id: string): Promise<void>;

	/**
	 * Query all the streams, will not return entries.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, dateCreated, dateModified and annotationObject.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query(
		conditions?: EntityCondition<IAuditableItemStream>,
		orderBy?: keyof Pick<IAuditableItemStream, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		limit?: number
	): Promise<{
		entries: IAuditableItemStreamList;
		cursor?: string;
	}>;

	/**
	 * Create an entry in the stream.
	 * @param streamId The id of the stream to create the entry in.
	 * @param entryObject The object for the stream as JSON-LD.
	 * @returns The id of the created entry, if not provided.
	 */
	createEntry(streamId: string, entryObject: IJsonLdNodeObject): Promise<string>;

	/**
	 * Get the entry from the stream.
	 * @param streamId The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifyEntry Should the entry be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntry(
		streamId: string,
		entryId: string,
		options?: {
			verifyEntry?: boolean;
		}
	): Promise<IAuditableItemStreamEntry>;

	/**
	 * Get the entry object from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntryObject(id: string, entryId: string): Promise<IJsonLdNodeObject>;

	/**
	 * Update an entry in the stream.
	 * @param streamId The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryObject The object for the entry as JSON-LD.
	 * @returns A promise that resolves when the entry has been updated.
	 */
	updateEntry(streamId: string, entryId: string, entryObject: IJsonLdNodeObject): Promise<void>;

	/**
	 * Remove from the stream.
	 * @param streamId The id of the stream to remove from.
	 * @param entryId The id of the entry to delete.
	 * @returns A promise that resolves when the entry has been removed.
	 */
	removeEntry(streamId: string, entryId: string): Promise<void>;

	/**
	 * Get the entries for the stream.
	 * @param streamId The id of the stream to get, if undefined returns all matching entries.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.verifyEntries Should the entries be verified, defaults to false.
	 * @param options.limit How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntries(
		streamId?: string,
		options?: {
			conditions?: EntityCondition<IAuditableItemStreamEntry>;
			includeDeleted?: boolean;
			verifyEntries?: boolean;
			limit?: number;
			cursor?: string;
			order?: SortDirection;
		}
	): Promise<{
		entries: IAuditableItemStreamEntryList;
		cursor?: string;
	}>;

	/**
	 * Get the entry objects for the stream.
	 * @param streamId The id of the stream to get, if undefined returns all matching entries.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.limit How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	getEntryObjects(
		streamId?: string,
		options?: {
			conditions?: EntityCondition<IAuditableItemStreamEntry>;
			includeDeleted?: boolean;
			limit?: number;
			cursor?: string;
			order?: SortDirection;
		}
	): Promise<{
		entries: IAuditableItemStreamEntryObjectList;
		cursor?: string;
	}>;

	/**
	 * Remove the proof for the stream and entries.
	 * @param streamId The id of the stream to remove the proof from.
	 * @returns A promise that resolves when the proof has been removed.
	 * @throws NotFoundError if the vertex is not found.
	 */
	removeProof(streamId: string): Promise<void>;
}

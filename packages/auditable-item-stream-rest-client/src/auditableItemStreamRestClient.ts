// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@3sixty/api-core";
import {
	HttpHeaderHelper,
	HttpParameterHelper,
	type IBaseRestClientConfig,
	type ICreatedResponse,
	type INoContentResponse
} from "@3sixty/api-models";
import type {
	IAuditableItemStream,
	IAuditableItemStreamBase,
	IAuditableItemStreamCloseRequest,
	IAuditableItemStreamComponent,
	IAuditableItemStreamCreateEntryRequest,
	IAuditableItemStreamCreateRequest,
	IAuditableItemStreamDeleteEntryRequest,
	IAuditableItemStreamDeleteRequest,
	IAuditableItemStreamEntry,
	IAuditableItemStreamEntryList,
	IAuditableItemStreamEntryObjectList,
	IAuditableItemStreamGetEntryObjectRequest,
	IAuditableItemStreamGetEntryObjectResponse,
	IAuditableItemStreamGetEntryRequest,
	IAuditableItemStreamGetEntryResponse,
	IAuditableItemStreamGetRequest,
	IAuditableItemStreamGetResponse,
	IAuditableItemStreamList,
	IAuditableItemStreamListEntriesNoStreamRequest,
	IAuditableItemStreamListEntriesRequest,
	IAuditableItemStreamListEntriesResponse,
	IAuditableItemStreamListEntryObjectsNoStreamRequest,
	IAuditableItemStreamListEntryObjectsRequest,
	IAuditableItemStreamListEntryObjectsResponse,
	IAuditableItemStreamListRequest,
	IAuditableItemStreamListResponse,
	IAuditableItemStreamRemoveProofRequest,
	IAuditableItemStreamUpdateEntryRequest,
	IAuditableItemStreamUpdateRequest
} from "@3sixty/auditable-item-stream-models";
import { Coerce, Guards, Is } from "@3sixty/core";
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { EntityCondition, SortDirection } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpMethod, MimeTypes } from "@3sixty/web";

/**
 * Client for performing auditable item stream through to REST endpoints.
 */
export class AuditableItemStreamRestClient
	extends BaseRestClient
	implements IAuditableItemStreamComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuditableItemStreamRestClient>();

	/**
	 * Create a new instance of AuditableItemStreamRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<AuditableItemStreamRestClient>(), config, "auditable-item-stream");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AuditableItemStreamRestClient.CLASS_NAME;
	}

	/**
	 * Create a new stream.
	 * @param stream The stream to create.
	 * @returns The id of the new stream item.
	 */
	public async create(stream: IAuditableItemStreamBase): Promise<string> {
		Guards.object(AuditableItemStreamRestClient.CLASS_NAME, nameof(stream), stream);
		const response = await this.fetch<IAuditableItemStreamCreateRequest, ICreatedResponse>(
			"/",
			HttpMethod.POST,
			{
				body: stream
			}
		);

		return HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`);
	}

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
	 * @throws NotFoundError if the stream is not found
	 */
	public async get(
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
	}> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemStreamGetRequest,
			IAuditableItemStreamGetResponse
		>("/:id", HttpMethod.GET, {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				cursor,
				limit: Coerce.string(limit),
				includeEntries: Coerce.string(options?.includeEntries),
				includeDeleted: Coerce.string(options?.includeDeleted),
				verifyStream: Coerce.string(options?.verifyStream),
				verifyEntries: Coerce.string(options?.verifyEntries)
			}
		});

		return {
			stream: response.body,
			cursor: HttpHeaderHelper.extractCursor(response.headers)
		};
	}

	/**
	 * Update a stream.
	 * @param stream The stream to update, does not update entries.
	 * @returns A promise that resolves when the stream has been updated.
	 */
	public async update(
		stream: Pick<IAuditableItemStream, "@context" | "type" | "id" | "annotationObject">
	): Promise<void> {
		Guards.object(AuditableItemStreamRestClient.CLASS_NAME, nameof(stream), stream);
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(stream.id), stream.id);

		const { id, ...rest } = stream;
		await this.fetch<IAuditableItemStreamUpdateRequest, INoContentResponse>(
			"/:id",
			HttpMethod.PUT,
			{
				pathParams: {
					id
				},
				body: rest
			}
		);
	}

	/**
	 * Close the stream.
	 * @param id The id of the stream to close.
	 * @returns A promise that resolves when the stream has been closed.
	 */
	public async close(id: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditableItemStreamCloseRequest, INoContentResponse>(
			"/:id/close",
			HttpMethod.PUT,
			{
				pathParams: {
					id
				}
			}
		);
	}

	/**
	 * Remove the notarization proof from a stream.
	 * @param streamId The id of the stream.
	 * @returns A promise that resolves when the proof has been removed.
	 */
	public async removeProof(streamId: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(streamId), streamId);

		await this.fetch<IAuditableItemStreamRemoveProofRequest, INoContentResponse>(
			"/:id/proof",
			HttpMethod.DELETE,
			{
				pathParams: { id: streamId }
			}
		);
	}

	/**
	 * Delete the stream.
	 * @param id The id of the stream to remove.
	 * @returns A promise that resolves when the stream has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditableItemStreamDeleteRequest, INoContentResponse>(
			"/:id",
			HttpMethod.DELETE,
			{
				pathParams: {
					id
				}
			}
		);
	}

	/**
	 * Query all the streams, will not return entries.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, created and object.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
		conditions?: EntityCondition<IAuditableItemStream>,
		orderBy?: keyof Pick<IAuditableItemStream, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemStream)[],
		cursor?: string,
		limit?: number
	): Promise<{
		entries: IAuditableItemStreamList;
		cursor?: string;
	}> {
		const response = await this.fetch<
			IAuditableItemStreamListRequest,
			IAuditableItemStreamListResponse
		>("/", HttpMethod.GET, {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			query: {
				conditions: HttpParameterHelper.objectToString(conditions),
				orderBy,
				orderByDirection,
				properties: HttpParameterHelper.arrayToString(properties),
				cursor,
				limit: Coerce.string(limit)
			}
		});

		return {
			entries: response.body,
			cursor: HttpHeaderHelper.extractCursor(response.headers)
		};
	}

	/**
	 * Create an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryObject The object for the stream as JSON-LD.
	 * @returns The id of the created entry, if not provided.
	 */
	public async createEntry(id: string, entryObject: IJsonLdNodeObject): Promise<string> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IAuditableItemStreamCreateEntryRequest, ICreatedResponse>(
			"/:id/entries",
			HttpMethod.POST,
			{
				pathParams: {
					id
				},
				body: {
					entryObject
				}
			}
		);

		return HttpHeaderHelper.extractId(
			response.headers,
			`${this.getPathPrefix()}/:streamId/entries/:id`
		);
	}

	/**
	 * Get the entry from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifyEntry Should the entry be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntry(
		id: string,
		entryId: string,
		options?: {
			verifyEntry?: boolean;
		}
	): Promise<IAuditableItemStreamEntry> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(entryId), entryId);

		const response = await this.fetch<
			IAuditableItemStreamGetEntryRequest,
			IAuditableItemStreamGetEntryResponse
		>("/:id/entries/:entryId", HttpMethod.GET, {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			query: {
				verifyEntry: Coerce.string(options?.verifyEntry)
			},
			pathParams: {
				id,
				entryId
			}
		});

		return response.body;
	}

	/**
	 * Get the entry object from the stream.
	 * @param id The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntryObject(id: string, entryId: string): Promise<IJsonLdNodeObject> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(entryId), entryId);

		const response = await this.fetch<
			IAuditableItemStreamGetEntryObjectRequest,
			IAuditableItemStreamGetEntryObjectResponse
		>("/:id/entries/:entryId/object", HttpMethod.GET, {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id,
				entryId
			}
		});

		return response.body;
	}

	/**
	 * Update an entry in the stream.
	 * @param id The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryObject The object for the entry as JSON-LD.
	 * @returns A promise that resolves when the entry has been updated.
	 */
	public async updateEntry(
		id: string,
		entryId: string,
		entryObject: IJsonLdNodeObject
	): Promise<void> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(entryId), entryId);

		await this.fetch<IAuditableItemStreamUpdateEntryRequest, INoContentResponse>(
			"/:id/entries/:entryId",
			HttpMethod.PUT,
			{
				pathParams: {
					id,
					entryId
				},
				body: {
					entryObject
				}
			}
		);
	}

	/**
	 * Remove from the stream.
	 * @param id The id of the stream to remove from.
	 * @param entryId The id of the entry to remove.
	 * @returns A promise that resolves when the entry has been removed.
	 */
	public async removeEntry(id: string, entryId: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);
		Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(entryId), entryId);

		await this.fetch<IAuditableItemStreamDeleteEntryRequest, INoContentResponse>(
			"/:id/entries/:entryId",
			HttpMethod.DELETE,
			{
				pathParams: {
					id,
					entryId
				}
			}
		);
	}

	/**
	 * Get the entries for the stream.
	 * @param id The id of the stream to get, if undefined returns all matching entries.
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
	public async getEntries(
		id?: string,
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
	}> {
		const queryParams = {
			conditions: HttpParameterHelper.objectToString(options?.conditions),
			includeDeleted: Coerce.string(options?.includeDeleted),
			verifyEntries: Coerce.string(options?.verifyEntries),
			limit: Coerce.string(options?.limit),
			cursor: options?.cursor,
			order: options?.order
		};

		let response;
		if (!Is.empty(id)) {
			Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);

			response = await this.fetch<
				IAuditableItemStreamListEntriesRequest,
				IAuditableItemStreamListEntriesResponse
			>("/:id/entries", HttpMethod.GET, {
				headers: {
					[HeaderTypes.Accept]: MimeTypes.JsonLd
				},
				pathParams: {
					id
				},
				query: queryParams
			});
		} else {
			response = await this.fetch<
				IAuditableItemStreamListEntriesNoStreamRequest,
				IAuditableItemStreamListEntriesResponse
			>("/entries", HttpMethod.GET, {
				headers: {
					[HeaderTypes.Accept]: MimeTypes.JsonLd
				},
				query: queryParams
			});
		}

		return {
			entries: response.body,
			cursor: HttpHeaderHelper.extractCursor(response.headers)
		};
	}

	/**
	 * Get the entry objects for the stream.
	 * @param id The id of the stream to get, if undefined returns all matching entries.
	 * @param options Additional options for the get operation.
	 * @param options.conditions The conditions to filter the stream.
	 * @param options.includeDeleted Whether to include deleted entries, defaults to false.
	 * @param options.limit How many entries to return.
	 * @param options.cursor Cursor to use for next chunk of data.
	 * @param options.order Retrieve the entries in ascending/descending time order, defaults to Ascending.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntryObjects(
		id?: string,
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
	}> {
		const queryParams = {
			conditions: HttpParameterHelper.objectToString(options?.conditions),
			includeDeleted: Coerce.string(options?.includeDeleted),
			limit: Coerce.string(options?.limit),
			cursor: options?.cursor,
			order: options?.order
		};

		let response;
		if (!Is.empty(id)) {
			Guards.stringValue(AuditableItemStreamRestClient.CLASS_NAME, nameof(id), id);
			response = await this.fetch<
				IAuditableItemStreamListEntryObjectsRequest,
				IAuditableItemStreamListEntryObjectsResponse
			>("/:id/entries/objects", HttpMethod.GET, {
				headers: {
					[HeaderTypes.Accept]: MimeTypes.JsonLd
				},
				pathParams: {
					id
				},
				query: queryParams
			});
		} else {
			response = await this.fetch<
				IAuditableItemStreamListEntryObjectsNoStreamRequest,
				IAuditableItemStreamListEntryObjectsResponse
			>("/entries/objects", HttpMethod.GET, {
				headers: {
					[HeaderTypes.Accept]: MimeTypes.JsonLd
				},
				query: queryParams
			});
		}

		return {
			entries: response.body,
			cursor: HttpHeaderHelper.extractCursor(response.headers)
		};
	}
}

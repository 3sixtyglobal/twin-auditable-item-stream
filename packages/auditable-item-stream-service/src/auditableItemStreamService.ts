// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HealthCategory,
	HealthStatus,
	type HealthApplicationCallback,
	type IHealth,
	type IHealthProviderComponent
} from "@twin.org/api-models";
import {
	AuditableItemStreamContexts,
	AuditableItemStreamDataTypes,
	AuditableItemStreamMetricIds,
	AuditableItemStreamMetrics,
	AuditableItemStreamModes,
	AuditableItemStreamTopics,
	AuditableItemStreamTypes,
	type IAuditableItemStream,
	type IAuditableItemStreamBase,
	type IAuditableItemStreamComponent,
	type IAuditableItemStreamEntry,
	type IAuditableItemStreamEntryList,
	type IAuditableItemStreamEntryObjectList,
	type IAuditableItemStreamEventBusStreamCreated,
	type IAuditableItemStreamEventBusStreamDeleted,
	type IAuditableItemStreamEventBusStreamEntryCreated,
	type IAuditableItemStreamEventBusStreamEntryDeleted,
	type IAuditableItemStreamEventBusStreamEntryUpdated,
	type IAuditableItemStreamEventBusStreamUpdated,
	type IAuditableItemStreamList
} from "@twin.org/auditable-item-stream-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore } from "@twin.org/context";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	Mutex,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	Urn,
	Validation,
	type IValidationFailure
} from "@twin.org/core";
import { DataTypeHelper } from "@twin.org/data-core";
import {
	JsonLdDataTypes,
	JsonLdHelper,
	JsonLdProcessor,
	type IJsonLdNodeObject
} from "@twin.org/data-json-ld";
import {
	ComparisonOperator,
	LogicalOperator,
	SortDirection,
	type EntityCondition,
	type IComparatorGroup
} from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { IEventBusComponent } from "@twin.org/event-bus-models";
import {
	ImmutableProofContexts,
	ImmutableProofDataTypes,
	type IImmutableProofComponent,
	type IImmutableProofVerification
} from "@twin.org/immutable-proof-models";
import { nameof, nameofKebabCase } from "@twin.org/nameof";
import {
	SchemaOrgContexts,
	SchemaOrgDataTypes,
	SchemaOrgTypes
} from "@twin.org/standards-schema-org";
import { MetricHelper, type ITelemetryComponent } from "@twin.org/telemetry-models";
import type { AuditableItemStream } from "./entities/auditableItemStream.js";
import type { AuditableItemStreamEntry } from "./entities/auditableItemStreamEntry.js";
import type { IAuditableItemStreamServiceConfig } from "./models/IAuditableItemStreamServiceConfig.js";
import type { IAuditableItemStreamServiceConstructorOptions } from "./models/IAuditableItemStreamServiceConstructorOptions.js";
import type { IAuditableItemStreamServiceContext } from "./models/IAuditableItemStreamServiceContext.js";
import type { IAuditableItemStreamServiceCursor } from "./models/IAuditableItemStreamServiceCursor.js";

/**
 * Class for performing auditable item stream operations.
 */
export class AuditableItemStreamService
	implements IAuditableItemStreamComponent, IHealthProviderComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuditableItemStreamService>();

	/**
	 * The namespace for the service.
	 * @internal
	 */
	private static readonly _NAMESPACE: string = "ais";

	/**
	 * The keys to pick when creating the proof for the stream.
	 * @internal
	 */
	private static readonly _PROOF_KEYS_STREAM: (keyof AuditableItemStream)[] = [
		"id",
		"organizationIdentity",
		"userIdentity",
		"dateCreated"
	];

	/**
	 * The keys to pick when creating the proof for the stream entry.
	 * @internal
	 */
	private static readonly _PROOF_KEYS_STREAM_ENTRY: (keyof AuditableItemStreamEntry)[] = [
		"id",
		"streamId",
		"userIdentity",
		"dateCreated",
		"entryObject",
		"index"
	];

	/**
	 * The configuration for the connector.
	 * @internal
	 */
	private readonly _config: IAuditableItemStreamServiceConfig;

	/**
	 * The immutable proof component.
	 * @internal
	 */
	private readonly _immutableProofComponent: IImmutableProofComponent;

	/**
	 * The entity storage for streams.
	 * @internal
	 */
	private readonly _streamStorage: IEntityStorageConnector<AuditableItemStream>;

	/**
	 * The entity storage for stream entries.
	 * @internal
	 */
	private readonly _streamEntryStorage: IEntityStorageConnector<AuditableItemStreamEntry>;

	/**
	 * The event bus component.
	 * @internal
	 */
	private readonly _eventBusComponent?: IEventBusComponent;

	/**
	 * The telemetry component.
	 * @internal
	 */
	private readonly _telemetryComponent?: ITelemetryComponent;

	/**
	 * The default interval for the integrity checks.
	 * @internal
	 */
	private readonly _defaultImmutableInterval: number;

	/**
	 * The timeout in milliseconds when acquiring a mutex lock.
	 * @internal
	 */
	private readonly _mutexTimeoutMs?: number;

	/**
	 * Create a new instance of AuditableItemStreamService.
	 * @param options The dependencies for the auditable item stream connector.
	 */
	constructor(options?: IAuditableItemStreamServiceConstructorOptions) {
		this._immutableProofComponent = ComponentFactory.get(
			options?.immutableProofComponentType ?? "immutable-proof"
		);

		this._streamStorage = EntityStorageConnectorFactory.get(
			options?.streamEntityStorageType ?? nameofKebabCase<AuditableItemStream>()
		);

		this._streamEntryStorage = EntityStorageConnectorFactory.get(
			options?.streamEntryEntityStorageType ?? nameofKebabCase<AuditableItemStreamEntry>()
		);

		if (Is.stringValue(options?.eventBusComponentType)) {
			this._eventBusComponent = ComponentFactory.get(options.eventBusComponentType);
		}

		this._telemetryComponent = ComponentFactory.getIfExists<ITelemetryComponent>(
			options?.telemetryComponentType
		);

		this._config = options?.config ?? {};
		this._defaultImmutableInterval = this._config.defaultImmutableInterval ?? 10;
		this._mutexTimeoutMs = Coerce.integer(options?.config?.mutexTimeoutMs);

		SchemaOrgDataTypes.registerRedirects();
		AuditableItemStreamDataTypes.registerTypes();
		JsonLdDataTypes.registerTypes();
		ImmutableProofDataTypes.registerTypes();
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AuditableItemStreamService.CLASS_NAME;
	}

	/**
	 * Runs a set/get/remove cycle against the stream entity storage using the organisation identity
	 * from the current context.
	 * @param callback The callback to invoke when a deferred health result is ready.
	 * @returns The health status of the service.
	 */
	public async healthApplication(
		callback: HealthApplicationCallback
	): Promise<IHealth[] | undefined> {
		const contextIds = (await ContextIdStore.getContextIds()) ?? {};
		const orgId = contextIds[ContextIdKeys.Organization];

		if (!Is.stringValue(orgId)) {
			return [];
		}

		try {
			const healthStream = {
				id: RandomHelper.generateUuidV7("compact"),
				dateCreated: new Date().toISOString(),
				organizationIdentity: orgId,
				numberOfItems: 0,
				immutableInterval: 0
			};
			await this._streamStorage.set(healthStream);
			await this._streamStorage.get(healthStream.id);
			await this._streamStorage.remove(healthStream.id);
			return [
				{
					source: AuditableItemStreamService.CLASS_NAME,
					category: HealthCategory.Application,
					status: HealthStatus.Ok,
					description: "healthDescription"
				}
			];
		} catch (error) {
			return [
				{
					source: AuditableItemStreamService.CLASS_NAME,
					category: HealthCategory.Application,
					status: HealthStatus.Error,
					description: "healthDescription",
					message: "getStreamFailed",
					error: BaseError.fromError(error)
				}
			];
		}
	}

	/**
	 * Register all AIS metrics with the telemetry component.
	 * @returns A promise that resolves when the metrics have been registered.
	 */
	public async start(): Promise<void> {
		if (Is.undefined(this._telemetryComponent)) {
			return;
		}
		await MetricHelper.createMetrics(this._telemetryComponent, AuditableItemStreamMetrics);
	}

	/**
	 * Create a new stream.
	 * @param stream The stream to create.
	 * @returns The id of the new stream item.
	 */
	public async create(stream: IAuditableItemStreamBase): Promise<string> {
		Guards.object(AuditableItemStreamService.CLASS_NAME, nameof(stream), stream);

		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Organization);

		try {
			const ownerOrganizationId =
				contextIds[ContextIdKeys.UserOrganization] ?? contextIds[ContextIdKeys.Organization];

			const id = RandomHelper.generateUuidV7("compact");

			const schemaValidationFailures: IValidationFailure[] = [];
			await DataTypeHelper.validate(
				nameof(stream),
				`${AuditableItemStreamContexts.Namespace}${AuditableItemStreamTypes.Stream}Base`,
				stream,
				schemaValidationFailures
			);
			Validation.asValidationError(
				AuditableItemStreamService.CLASS_NAME,
				nameof(stream),
				schemaValidationFailures
			);

			if (stream.closed && !Is.arrayValue(stream.entries?.[SchemaOrgTypes.ItemListElement])) {
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "closedRequiresEntries");
			}

			if (Is.object(stream.annotationObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(stream.annotationObject, validationFailures);
				Validation.asValidationError(
					AuditableItemStreamService.CLASS_NAME,
					nameof(stream.annotationObject),
					validationFailures
				);
			}

			const context: IAuditableItemStreamServiceContext = {
				now: new Date(Date.now()).toISOString(),
				contextIds,
				indexCounter: 0,
				immutableInterval: stream?.immutableInterval ?? this._defaultImmutableInterval,
				organizationIdentity: ownerOrganizationId
			};

			const streamEntity: AuditableItemStream = {
				id,
				organizationIdentity: ownerOrganizationId,
				userIdentity: contextIds?.[ContextIdKeys.User],
				dateCreated: context.now,
				immutableInterval: context.immutableInterval,
				closed: stream.closed,
				mode: stream.mode,
				numberOfItems: 0
			};

			const streamUrn = await this.createStreamProof(streamEntity, context.immutableInterval);

			if (Is.arrayValue(stream.entries?.[SchemaOrgTypes.ItemListElement])) {
				for (const entry of stream.entries[SchemaOrgTypes.ItemListElement]) {
					await this.setEntry(context, id, entry);
				}
			}

			// Add these dynamic properties to the stream object after the proof has been created.
			streamEntity.dateModified = context.now;
			streamEntity.annotationObject = stream.annotationObject;
			streamEntity.numberOfItems = context.indexCounter;

			await this._streamStorage.set(streamEntity);

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemStreamMetricIds.StreamsCreated,
				{
					mode: streamEntity.mode ?? AuditableItemStreamModes.Default,
					immutableInterval: context.immutableInterval
				}
			);

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamCreated>(
				AuditableItemStreamTopics.StreamCreated,
				{ id: streamUrn }
			);

			return streamUrn;
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"createFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Close a stream.
	 * @param id The id of the stream to close.
	 * @returns A promise that resolves when the stream has been closed.
	 */
	public async close(id: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id
			});
		}

		const streamId = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });
		try {
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", id);
			}

			if (!streamEntity.closed) {
				streamEntity.closed = true;
				streamEntity.dateModified = new Date(Date.now()).toISOString();

				await this._streamStorage.set(streamEntity);

				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.StreamsClosed
				);

				await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamUpdated>(
					AuditableItemStreamTopics.StreamUpdated,
					{ id }
				);
			}
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"closeFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamId);
		}
	}

	/**
	 * Update a stream.
	 * @param stream The stream to update, does not update entries.
	 * @returns A promise that resolves when the stream has been updated.
	 */
	public async update(
		stream: Pick<IAuditableItemStream, "@context" | "type" | "id" | "annotationObject">
	): Promise<void> {
		Guards.object(AuditableItemStreamService.CLASS_NAME, nameof(stream), stream);
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(stream.id), stream.id);

		const urnParsed = Urn.fromValidString(stream.id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: stream.id
			});
		}

		const streamId = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });
		try {
			const schemaValidationFailures: IValidationFailure[] = [];
			await DataTypeHelper.validate(
				nameof(stream),
				`${AuditableItemStreamContexts.Namespace}${AuditableItemStreamTypes.Stream}`,
				stream,
				schemaValidationFailures
			);
			Validation.asValidationError(
				AuditableItemStreamService.CLASS_NAME,
				nameof(stream),
				schemaValidationFailures
			);

			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", stream.id);
			}

			if (Is.object(stream.annotationObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(stream.annotationObject, validationFailures);
				Validation.asValidationError(
					AuditableItemStreamService.CLASS_NAME,
					nameof(stream.annotationObject),
					validationFailures
				);
			}

			let changed = false;

			if (!ObjectHelper.equal(streamEntity.annotationObject, stream.annotationObject, false)) {
				streamEntity.annotationObject = stream.annotationObject;
				changed = true;
			}

			const contextIds = await ContextIdStore.getContextIds();
			const ownerOrganizationId =
				contextIds?.[ContextIdKeys.UserOrganization] ?? contextIds?.[ContextIdKeys.Organization];
			if (
				!Is.stringValue(streamEntity.organizationIdentity) &&
				Is.stringValue(ownerOrganizationId)
			) {
				streamEntity.organizationIdentity = ownerOrganizationId;
				changed = true;
			}

			if (
				!Is.stringValue(streamEntity.proofId) &&
				Is.stringValue(streamEntity.organizationIdentity)
			) {
				await this.createStreamProof(
					streamEntity,
					streamEntity.immutableInterval ?? this._defaultImmutableInterval
				);
				if (Is.stringValue(streamEntity.proofId)) {
					changed = true;
				}
			}

			if (changed) {
				streamEntity.dateModified = new Date(Date.now()).toISOString();

				await this._streamStorage.set(streamEntity);

				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.StreamsUpdated
				);

				await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamUpdated>(
					AuditableItemStreamTopics.StreamUpdated,
					{ id: stream.id }
				);
			}
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"updatingFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamId);
		}
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
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id
			});
		}

		try {
			const streamId = urnParsed.namespaceSpecific(0);

			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", id);
			}

			const verifyStream = options?.verifyStream ?? false;
			const verifyEntries = options?.verifyEntries ?? false;

			const streamModel = this.streamEntityToJsonLd(streamEntity);
			let returnCursor;

			if (options?.includeEntries) {
				const result = await this.findEntries(
					streamId,
					options?.includeDeleted,
					verifyEntries,
					undefined,
					undefined,
					undefined,
					limit,
					cursor
				);
				streamModel.entries = {
					type: SchemaOrgTypes.ItemList,
					[SchemaOrgTypes.ItemListElement]: result.entries
				};
				returnCursor = result.cursor;
			}

			if (verifyStream && Is.stringValue(streamEntity.proofId)) {
				streamModel.verification = await this._immutableProofComponent.verify(streamEntity.proofId);
			}

			if (verifyStream || verifyEntries) {
				streamModel["@context"].push(ImmutableProofContexts.Context);
			}

			const result = await JsonLdProcessor.compact(streamModel, streamModel["@context"], {
				compactArrays: false
			});
			return {
				stream: result,
				cursor: returnCursor
			};
		} catch (error) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Delete the stream.
	 * @param id The id of the stream to remove.
	 * @returns A promise that resolves when the stream has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id
			});
		}

		const streamId = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });

		try {
			const streamEntity = await this._streamStorage.get(streamId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", id);
			}

			await this.internalRemoveEntries(streamEntity, false);

			await this._streamStorage.remove(streamEntity.id);

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemStreamMetricIds.StreamsDeleted
			);

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamDeleted>(
				AuditableItemStreamTopics.StreamDeleted,
				{ id }
			);
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"removingFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamId);
		}
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
		try {
			let propertiesToReturn: (keyof IAuditableItemStream)[] = properties ?? [
				"id",
				"dateCreated",
				"dateModified",
				"annotationObject"
			];
			const orderProperty: keyof IAuditableItemStream = orderBy ?? "dateCreated";
			const orderDirection = orderByDirection ?? SortDirection.Descending;

			// We never return entries from this method as this would involve a lot of lookups
			// and we want to keep this method fast.
			if (propertiesToReturn.includes("entries")) {
				propertiesToReturn = propertiesToReturn.filter(p => p !== "entries");
			}

			const results = await this._streamStorage.query(
				conditions,
				[
					{
						property: orderProperty,
						sortDirection: orderDirection
					}
				],
				propertiesToReturn as (keyof AuditableItemStream)[],
				cursor,
				limit
			);

			const list: IAuditableItemStreamList = {
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamList],
				[SchemaOrgTypes.ItemListElement]: (results.entities as AuditableItemStream[]).map(e =>
					this.streamEntityToJsonLd(e)
				)
			};

			const result = await JsonLdProcessor.compact(list, list["@context"], {
				compactArrays: false
			});
			return {
				entries: result,
				cursor: results.cursor
			};
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"queryingFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Create an entry in the stream.
	 * @param streamId The id of the stream to update.
	 * @param entryObject The object for the stream as JSON-LD.
	 * @returns The id of the created entry, if not provided.
	 */
	public async createEntry(streamId: string, entryObject: IJsonLdNodeObject): Promise<string> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);

		const contextIds = await ContextIdStore.getContextIds();

		const urnParsed = Urn.fromValidString(streamId);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: streamId
			});
		}

		const streamIdParts = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamIdParts, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });
		try {
			const streamEntity = await this._streamStorage.get(streamIdParts);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(
					AuditableItemStreamService.CLASS_NAME,
					"streamNotFound",
					streamIdParts
				);
			}

			if (streamEntity.closed) {
				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.ClosedStreamRejections,
					{ operation: "createEntry" }
				);
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "streamClosed", {
					id: streamId
				});
			}

			const context: IAuditableItemStreamServiceContext = {
				now: new Date(Date.now()).toISOString(),
				contextIds,
				indexCounter: streamEntity.numberOfItems,
				immutableInterval: streamEntity.immutableInterval,
				organizationIdentity:
					streamEntity.organizationIdentity ?? contextIds?.[ContextIdKeys.Organization]
			};

			const createdId = await this.setEntry(context, streamEntity.id, {
				entryObject
			});

			streamEntity.dateModified = context.now;
			streamEntity.numberOfItems = context.indexCounter;

			await this._streamStorage.set(streamEntity);

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemStreamMetricIds.EntriesCreated,
				{
					hasProof:
						context.immutableInterval > 0 &&
						(context.indexCounter - 1) % context.immutableInterval === 0
				}
			);

			const fullId = new Urn(AuditableItemStreamService._NAMESPACE, [
				streamEntity.id,
				createdId
			]).toString();

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamEntryCreated>(
				AuditableItemStreamTopics.StreamEntryCreated,
				{ id: streamId, entryId: fullId }
			);

			return fullId;
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"creatingEntryFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamIdParts);
		}
	}

	/**
	 * Get the entry from the stream.
	 * @param streamId The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @param options Additional options for the get operation.
	 * @param options.verifyEntry Should the entry be verified, defaults to false.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntry(
		streamId: string,
		entryId: string,
		options?: {
			verifyEntry?: boolean;
		}
	): Promise<IAuditableItemStreamEntry> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(entryId), entryId);

		const urnParsed = Urn.fromValidString(streamId);
		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: streamId
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);
		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: entryId
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);

			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", streamId);
			}

			const verifyEntry = options?.verifyEntry ?? false;

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const result = await this.findEntry(streamEntity.id, entryNamespaceId, verifyEntry);
			if (Is.empty(result)) {
				throw new NotFoundError(
					AuditableItemStreamService.CLASS_NAME,
					"streamEntryNotFound",
					entryId
				);
			}

			const entry = this.streamEntryEntityToJsonLd(result.entity);

			if (verifyEntry) {
				entry["@context"] = JsonLdProcessor.combineContexts(
					entry["@context"],
					ImmutableProofContexts.Context
				) as IAuditableItemStreamEntry["@context"];
				entry.verification = result.verification;
			}

			const result2 = await JsonLdProcessor.compact(entry, entry["@context"], {
				compactArrays: false
			});
			return result2;
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"gettingEntryFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Get the entry object from the stream.
	 * @param streamId The id of the stream to get.
	 * @param entryId The id of the stream entry to get.
	 * @returns The stream and entries if found.
	 * @throws NotFoundError if the stream is not found.
	 */
	public async getEntryObject(streamId: string, entryId: string): Promise<IJsonLdNodeObject> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(entryId), entryId);

		const urnParsed = Urn.fromValidString(streamId);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: streamId
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);

		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: entryId
			});
		}

		try {
			const streamNamespaceId = urnParsed.namespaceSpecific(0);

			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", streamId);
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const result = await this.findEntry(streamEntity.id, entryNamespaceId);
			if (Is.empty(result)) {
				throw new NotFoundError(
					AuditableItemStreamService.CLASS_NAME,
					"streamEntryNotFound",
					entryId
				);
			}

			return result.entity.entryObject;
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"gettingEntryObjectFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Update an entry in the stream.
	 * @param streamId The id of the stream to update.
	 * @param entryId The id of the entry to update.
	 * @param entryObject The object for the entry as JSON-LD.
	 * @returns A promise that resolves when the entry has been updated.
	 */
	public async updateEntry(
		streamId: string,
		entryId: string,
		entryObject: IJsonLdNodeObject
	): Promise<void> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(entryId), entryId);

		const urnParsed = Urn.fromValidString(streamId);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: streamId
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);

		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: entryId
			});
		}

		const streamNamespaceId = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamNamespaceId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });
		try {
			const streamEntryNamespaceId = urnParsedEntry.namespaceMethod();

			if (streamNamespaceId !== streamEntryNamespaceId) {
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
					namespace: streamNamespaceId,
					id: streamEntryNamespaceId
				});
			}

			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", streamId);
			}

			if (streamEntity.closed) {
				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.ClosedStreamRejections,
					{ operation: "updateEntry" }
				);
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "streamClosed", {
					id: streamId
				});
			}

			if (streamEntity.mode === AuditableItemStreamModes.AppendOnly) {
				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.AppendOnlyRejections,
					{ operation: "updateEntry" }
				);
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "appendOnlyNoEntryUpdates", {
					id: streamId
				});
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const existing = await this.findEntry(streamEntity.id, entryNamespaceId);
			if (Is.empty(existing)) {
				throw new NotFoundError(
					AuditableItemStreamService.CLASS_NAME,
					"streamEntryNotFound",
					entryId
				);
			}

			const contextIds = await ContextIdStore.getContextIds();
			const ownerOrganizationId =
				contextIds?.[ContextIdKeys.UserOrganization] ?? contextIds?.[ContextIdKeys.Organization];

			const context: IAuditableItemStreamServiceContext = {
				now: new Date(Date.now()).toISOString(),
				contextIds,
				indexCounter: streamEntity.numberOfItems,
				immutableInterval: streamEntity.immutableInterval,
				organizationIdentity: streamEntity.organizationIdentity ?? ownerOrganizationId
			};

			await this.setEntry(context, streamEntity.id, {
				...existing.entity,
				entryObject
			});

			streamEntity.dateModified = context.now;
			streamEntity.numberOfItems = context.indexCounter;

			await this._streamStorage.set(streamEntity);

			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemStreamMetricIds.EntriesUpdated
			);

			await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamEntryUpdated>(
				AuditableItemStreamTopics.StreamEntryUpdated,
				{ id: streamId, entryId }
			);
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"updatingEntryFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamNamespaceId);
		}
	}

	/**
	 * Delete from the stream.
	 * @param streamId The id of the stream to remove from.
	 * @param entryId The id of the entry to remove.
	 * @returns A promise that resolves when the entry has been removed.
	 */
	public async removeEntry(streamId: string, entryId: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(entryId), entryId);

		const urnParsed = Urn.fromValidString(streamId);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: streamId
			});
		}

		const urnParsedEntry = Urn.fromValidString(entryId);
		if (urnParsedEntry.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: entryId
			});
		}

		const streamNamespaceId = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamNamespaceId, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });
		try {
			const streamEntryNamespaceId = urnParsedEntry.namespaceMethod();

			if (streamNamespaceId !== streamEntryNamespaceId) {
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
					namespace: streamNamespaceId,
					id: streamEntryNamespaceId
				});
			}

			const streamEntity = await this._streamStorage.get(streamNamespaceId);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(AuditableItemStreamService.CLASS_NAME, "streamNotFound", streamId);
			}

			if (streamEntity.mode === AuditableItemStreamModes.AppendOnly) {
				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.AppendOnlyRejections,
					{ operation: "removeEntry" }
				);
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "appendOnlyNoEntryRemovals", {
					id: streamId
				});
			}

			const entryNamespaceId = urnParsedEntry.namespaceSpecific(1);
			const result = await this.findEntry(streamNamespaceId, entryNamespaceId);
			if (Is.empty(result)) {
				throw new NotFoundError(
					AuditableItemStreamService.CLASS_NAME,
					"streamEntryNotFound",
					entryId
				);
			}

			if (Is.empty(result.entity.dateDeleted)) {
				const contextIds = await ContextIdStore.getContextIds();
				const ownerOrganizationId =
					contextIds?.[ContextIdKeys.UserOrganization] ?? contextIds?.[ContextIdKeys.Organization];

				const context: IAuditableItemStreamServiceContext = {
					now: new Date(Date.now()).toISOString(),
					contextIds,
					indexCounter: streamEntity.numberOfItems,
					immutableInterval: streamEntity.immutableInterval,
					organizationIdentity: streamEntity.organizationIdentity ?? ownerOrganizationId
				};

				await this.setEntry(context, streamEntity.id, {
					...result.entity,
					dateDeleted: context.now
				});

				streamEntity.dateModified = context.now;
				streamEntity.numberOfItems = context.indexCounter;
				await this._streamStorage.set(streamEntity);

				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.EntriesDeleted
				);

				await this._eventBusComponent?.publish<IAuditableItemStreamEventBusStreamEntryDeleted>(
					AuditableItemStreamTopics.StreamEntryDeleted,
					{ id: streamId, entryId }
				);
			}
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"removingEntryFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamNamespaceId);
		}
	}

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
	public async getEntries(
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
	}> {
		let streamNamespaceId;
		if (!Is.empty(streamId)) {
			Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);

			const urnParsed = Urn.fromValidString(streamId);

			if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
					namespace: AuditableItemStreamService._NAMESPACE,
					id: streamId
				});
			}

			streamNamespaceId = urnParsed.namespaceSpecific(0);
		}

		try {
			if (Is.stringValue(streamNamespaceId)) {
				const streamEntity = await this._streamStorage.get(streamNamespaceId);

				if (Is.empty(streamEntity)) {
					throw new NotFoundError(
						AuditableItemStreamService.CLASS_NAME,
						"streamNotFound",
						streamId
					);
				}
			}

			const verifyEntries = options?.verifyEntries ?? false;

			const result = await this.findEntries(
				streamNamespaceId,
				options?.includeDeleted,
				verifyEntries,
				options?.conditions,
				options?.order,
				undefined,
				options?.limit,
				options?.cursor
			);

			const list: IAuditableItemStreamEntryList = {
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryList],
				[SchemaOrgTypes.ItemListElement]: result.entries
			};

			if (verifyEntries) {
				list["@context"].push(ImmutableProofContexts.Context);
			}

			const result2 = await JsonLdProcessor.compact(list, list["@context"], {
				compactArrays: false
			});
			return {
				entries: result2,
				cursor: result.cursor
			};
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"gettingEntriesFailed",
				undefined,
				error
			);
		}
	}

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
	public async getEntryObjects(
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
	}> {
		let streamNamespaceId;
		if (!Is.empty(streamId)) {
			Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);

			const urnParsed = Urn.fromValidString(streamId);

			if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
				throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
					namespace: AuditableItemStreamService._NAMESPACE,
					id: streamId
				});
			}

			streamNamespaceId = urnParsed.namespaceSpecific(0);
		}

		try {
			if (Is.stringValue(streamNamespaceId)) {
				const streamEntity = await this._streamStorage.get(streamNamespaceId);

				if (Is.empty(streamEntity)) {
					throw new NotFoundError(
						AuditableItemStreamService.CLASS_NAME,
						"streamNotFound",
						streamId
					);
				}
			}

			const result = await this.findEntries(
				streamNamespaceId,
				options?.includeDeleted,
				false,
				options?.conditions,
				options?.order,
				undefined,
				options?.limit,
				options?.cursor
			);

			const list: IAuditableItemStreamEntryObjectList = {
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryObjectList],
				[SchemaOrgTypes.ItemListElement]: result.entries.map(m => m.entryObject)
			};

			const result2 = await JsonLdProcessor.compact(list, list["@context"], {
				compactArrays: false
			});
			return {
				entries: result2,
				cursor: result.cursor
			};
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"gettingEntryObjectsFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Remove the proof for the stream and entries.
	 * @param streamId The id of the stream to remove the proof from.
	 * @returns A promise that resolves when the proof has been removed.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async removeProof(streamId: string): Promise<void> {
		Guards.stringValue(AuditableItemStreamService.CLASS_NAME, nameof(streamId), streamId);

		const urnParsed = Urn.fromValidString(streamId);

		if (urnParsed.namespaceIdentifier() !== AuditableItemStreamService._NAMESPACE) {
			throw new GeneralError(AuditableItemStreamService.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemStreamService._NAMESPACE,
				id: streamId
			});
		}

		const streamIdParts = urnParsed.namespaceSpecific(0);
		await Mutex.lock(streamIdParts, { throwOnTimeout: true, timeoutMs: this._mutexTimeoutMs });

		try {
			const streamEntity = await this._streamStorage.get(streamIdParts);

			if (Is.empty(streamEntity)) {
				throw new NotFoundError(
					AuditableItemStreamService.CLASS_NAME,
					"streamNotFound",
					streamIdParts
				);
			}

			await this.internalRemoveEntries(streamEntity, true);
		} catch (error) {
			throw new GeneralError(
				AuditableItemStreamService.CLASS_NAME,
				"removeProofFailed",
				undefined,
				error
			);
		} finally {
			Mutex.unlock(streamIdParts);
		}
	}

	/**
	 * Create an immutable proof for the stream entity if the conditions are met.
	 * @param streamEntity The stream entity to create the proof for.
	 * @param immutableInterval The immutable interval for the stream.
	 * @returns The proof id.
	 * @internal
	 */
	private async createStreamProof(
		streamEntity: AuditableItemStream,
		immutableInterval: number
	): Promise<string> {
		const streamModel = this.streamEntityToJsonLd(
			ObjectHelper.pick(streamEntity, AuditableItemStreamService._PROOF_KEYS_STREAM)
		);

		if (immutableInterval > 0 && Is.stringValue(streamModel.organizationIdentity)) {
			streamEntity.proofId = await this._immutableProofComponent.create(streamModel);
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemStreamMetricIds.ProofsCreatedStream
			);
		}

		return streamModel.id;
	}

	/**
	 * Map the stream entity to a JSON-LD model.
	 * @param streamEntity The stream entity.
	 * @returns The model.
	 * @internal
	 */
	private streamEntityToJsonLd(
		streamEntity: AuditableItemStream
	): IAuditableItemStream & IJsonLdNodeObject {
		const model: IAuditableItemStream & IJsonLdNodeObject = {
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			id: `${AuditableItemStreamService._NAMESPACE}:${streamEntity.id}`,
			dateCreated: streamEntity.dateCreated,
			dateModified: streamEntity.dateModified,
			organizationIdentity: streamEntity.organizationIdentity,
			userIdentity: streamEntity.userIdentity,
			annotationObject: streamEntity.annotationObject,
			immutableInterval: streamEntity.immutableInterval,
			proofId: streamEntity.proofId,
			numberOfItems: streamEntity.numberOfItems,
			closed: streamEntity.closed,
			mode: streamEntity.mode
		};

		return model;
	}

	/**
	 * Map the stream entry entity to a JSON-LD model.
	 * @param streamEntryEntity The stream entry entity.
	 * @returns The model
	 * @internal
	 */
	private streamEntryEntityToJsonLd(
		streamEntryEntity: AuditableItemStreamEntry
	): IAuditableItemStreamEntry {
		const streamEntryModel: IAuditableItemStreamEntry = {
			"@context": [
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon,
				SchemaOrgContexts.Context
			],
			type: AuditableItemStreamTypes.StreamEntry,
			id: `${AuditableItemStreamService._NAMESPACE}:${streamEntryEntity.streamId}:${streamEntryEntity.id}`,
			dateCreated: streamEntryEntity.dateCreated,
			dateModified: streamEntryEntity.dateModified,
			dateDeleted: streamEntryEntity.dateDeleted,
			entryObject: streamEntryEntity.entryObject,
			userIdentity: streamEntryEntity.userIdentity,
			index: streamEntryEntity.index,
			proofId: streamEntryEntity.proofId
		};
		return streamEntryModel;
	}

	/**
	 * Set a stream entry.
	 * @param context The context for the operation.
	 * @param streamId The stream id.
	 * @param entry The entry.
	 * @returns The id of the entry.
	 * @internal
	 */
	private async setEntry(
		context: IAuditableItemStreamServiceContext,
		streamId: string,
		entry: Partial<IAuditableItemStreamEntry>
	): Promise<string> {
		Guards.object(AuditableItemStreamService.CLASS_NAME, nameof(entry), entry);

		const contextIds = await ContextIdStore.getContextIds();

		if (Is.object(entry.entryObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(entry.entryObject, validationFailures);
			Validation.asValidationError(
				AuditableItemStreamService.CLASS_NAME,
				nameof(entry.entryObject),
				validationFailures
			);
		}

		const entity: AuditableItemStreamEntry = {
			id: entry.id ?? RandomHelper.generateUuidV7("compact"),
			streamId,
			dateCreated: entry.dateCreated ?? context.now,
			dateDeleted: entry.dateDeleted,
			entryObject: entry.entryObject ?? {},
			userIdentity: contextIds?.[ContextIdKeys.User],
			index: entry.index ?? context.indexCounter++
		};

		// If the created date is not the same as the context now, then we are modifying the entry.
		if (entity.dateCreated !== context.now) {
			entity.dateModified = context.now;
		}

		if (context.immutableInterval > 0 && entity.index % context.immutableInterval === 0) {
			// Create the JSON-LD object we want to use for the proof
			// this is a subset of fixed properties from the stream entry object.
			const streamEntryModel = this.streamEntryEntityToJsonLd(
				ObjectHelper.pick(entity, AuditableItemStreamService._PROOF_KEYS_STREAM_ENTRY)
			);

			// Create the proof for the stream object but only if we have an organization identity,
			// either from the stream or the context, as this is needed for the proof creation and immutability.
			if (Is.stringValue(context.organizationIdentity)) {
				entity.proofId = await this._immutableProofComponent.create(
					JsonLdHelper.toNodeObject(streamEntryModel)
				);
				await MetricHelper.metricIncrement(
					this._telemetryComponent,
					AuditableItemStreamMetricIds.ProofsCreatedEntry,
					{ index: entity.index }
				);
			}
		}

		await this._streamEntryStorage.set(entity);

		return entity.id;
	}

	/**
	 * Find a stream entry.
	 * @param streamId The stream id.
	 * @param entryId The entry id.
	 * @param verifyEntry Should the entry be verified.
	 * @returns The entry entity and optional verification result, or undefined if not found.
	 * @internal
	 */
	private async findEntry(
		streamId: string,
		entryId: string,
		verifyEntry?: boolean
	): Promise<
		| {
				entity: AuditableItemStreamEntry;
				verification?: IImmutableProofVerification;
		  }
		| undefined
	> {
		const conditions: IComparatorGroup<AuditableItemStreamEntry> = {
			conditions: [
				{
					property: "streamId",
					comparison: ComparisonOperator.Equals,
					value: streamId
				},
				{
					property: "id",
					comparison: ComparisonOperator.Equals,
					value: entryId
				}
			],
			logicalOperator: LogicalOperator.And
		};

		const result = await this._streamEntryStorage.query(
			conditions,
			[
				{
					property: "dateCreated",
					sortDirection: SortDirection.Descending
				}
			],
			undefined,
			undefined,
			1
		);

		if (result.entities.length > 0) {
			const entity = result.entities[0] as AuditableItemStreamEntry;

			let verification: IImmutableProofVerification | undefined;
			if ((verifyEntry ?? false) && Is.stringValue(entity.proofId)) {
				verification = await this._immutableProofComponent.verify(entity.proofId);
			}

			return {
				entity,
				verification
			};
		}
	}

	/**
	 * Encode the storage cursor and the include deleted flag as a single opaque cursor.
	 * @param cursor The storage cursor for the next page.
	 * @param includeDeleted Should deleted entries be included.
	 * @returns The opaque cursor.
	 * @internal
	 */
	private encodeCursor(cursor: string, includeDeleted: boolean): string {
		return Converter.bytesToBase64(
			ObjectHelper.toBytes<IAuditableItemStreamServiceCursor>({
				c: cursor,
				includeDeleted
			})
		);
	}

	/**
	 * Decode an opaque cursor back to the storage cursor and the include deleted flag.
	 * @param cursor The opaque cursor.
	 * @returns The storage cursor and the include deleted flag.
	 * @internal
	 */
	private decodeCursor(cursor: string): IAuditableItemStreamServiceCursor {
		try {
			const decoded = ObjectHelper.fromBytes<IAuditableItemStreamServiceCursor>(
				Converter.base64ToBytes(cursor)
			);
			if (Is.object(decoded) && Is.stringValue(decoded.c) && Is.boolean(decoded.includeDeleted)) {
				return decoded;
			}
		} catch {
			// A cursor which is not one of ours is passed through to the storage unchanged, which
			// rejects it there rather than here.
		}

		return { c: cursor, includeDeleted: false };
	}

	/**
	 * Find stream entries.
	 * @param streamId The stream id.
	 * @param includeDeleted Should deleted entries be included.
	 * @param verifyEntries Should the entries be verified.
	 * @param conditions The conditions to filter the entries.
	 * @param sortDirection The sort direction.
	 * @param propertiesToReturn The properties to return.
	 * @param limit Limit the number of entities when finding.
	 * @param cursor The cursor.
	 * @returns The stream entries and optional next cursor.
	 * @internal
	 */
	private async findEntries(
		streamId?: string,
		includeDeleted?: boolean,
		verifyEntries?: boolean,
		conditions?: EntityCondition<IAuditableItemStreamEntry>,
		sortDirection?: SortDirection,
		propertiesToReturn?: (keyof AuditableItemStreamEntry)[],
		limit?: number,
		cursor?: string
	): Promise<{
		entries: IAuditableItemStreamEntry[];
		cursor?: string;
	}> {
		const needToVerify = verifyEntries ?? false;

		const andGroups: EntityCondition<IAuditableItemStreamEntry>[] = [];

		if (Is.stringValue(streamId)) {
			andGroups.push({
				property: "streamId",
				comparison: ComparisonOperator.Equals,
				value: streamId
			});
		}

		// The cursor we hand out wraps the storage cursor together with the flag, so the flag
		// survives paging without the caller having to repeat it, and only the storage cursor is
		// passed on to the query.
		let storageCursor = cursor;
		if (Is.stringValue(cursor)) {
			const decoded = this.decodeCursor(cursor);
			storageCursor = decoded.c;
			includeDeleted = decoded.includeDeleted;
		}

		if (!(includeDeleted ?? false)) {
			andGroups.push({
				property: "dateDeleted",
				comparison: ComparisonOperator.Equals,
				value: undefined
			});
		}

		if (conditions !== undefined) {
			andGroups.push(conditions);
		}

		// If we need to verify the entries, we need to make sure we have
		// specific properties in the data, if the properties to return are not
		// an array then all will be retrieved anyway.
		if (needToVerify && Is.array(propertiesToReturn)) {
			propertiesToReturn ??= [];

			for (const property of AuditableItemStreamService._PROOF_KEYS_STREAM_ENTRY) {
				if (!propertiesToReturn.includes(property)) {
					propertiesToReturn.push(property);
				}
			}
		}

		const finalConditions: EntityCondition<IAuditableItemStream> = {
			logicalOperator: LogicalOperator.And,
			conditions: andGroups
		};

		const result = await this._streamEntryStorage.query(
			finalConditions,
			[
				{
					property: "dateCreated",
					sortDirection: sortDirection ?? SortDirection.Descending
				}
			],
			propertiesToReturn,
			storageCursor,
			limit
		);

		let returnCursor: string | undefined;

		// The cursor is only wrapped when there is a further page, otherwise the caller is handed
		// a cursor which carries nothing but the flag and asks for the first page again.
		if (Is.stringValue(result.cursor)) {
			returnCursor = this.encodeCursor(result.cursor, includeDeleted ?? false);
		}

		const entryModels: IAuditableItemStreamEntry[] = [];

		for (const entry of result.entities) {
			const entryModel = this.streamEntryEntityToJsonLd(entry as AuditableItemStreamEntry);

			if (needToVerify && Is.stringValue(entry.proofId)) {
				entryModel.verification = await this._immutableProofComponent.verify(entry.proofId);
			}
			entryModels.push(entryModel);
		}

		return {
			entries: entryModels,
			cursor: returnCursor
		};
	}

	/**
	 * Remove the verifiable storage for the stream and entries.
	 * @param streamEntity The stream entity.
	 * @param removeOnlyProof Should only the proof be removed.
	 * @returns A promise that resolves when the entries have been processed.
	 * @internal
	 */
	private async internalRemoveEntries(
		streamEntity: AuditableItemStream,
		removeOnlyProof: boolean
	): Promise<void> {
		if (Is.stringValue(streamEntity.proofId)) {
			await this._immutableProofComponent.removeNotarization(streamEntity.proofId);
			delete streamEntity.proofId;

			await this._streamStorage.set(streamEntity);
			await MetricHelper.metricIncrement(
				this._telemetryComponent,
				AuditableItemStreamMetricIds.ProofsRemovedStream
			);
		}

		const entryIds: string[] = [];
		let entriesResult;
		do {
			entriesResult = await this._streamEntryStorage.query(
				{
					property: "streamId",
					value: streamEntity.id,
					comparison: ComparisonOperator.Equals
				},
				[
					{
						property: "dateCreated",
						sortDirection: SortDirection.Ascending
					}
				],
				undefined,
				entriesResult?.cursor
			);

			for (const streamEntry of entriesResult.entities) {
				entryIds.push(streamEntry.id as string);
				if (Is.stringValue(streamEntry.proofId)) {
					await this._immutableProofComponent.removeNotarization(streamEntry.proofId);
					delete streamEntry.proofId;

					await MetricHelper.metricIncrement(
						this._telemetryComponent,
						AuditableItemStreamMetricIds.ProofsRemovedEntry
					);

					// If we are only removing the proof, we need to set the entry
					// otherwise the entry is going to be removed later anyway.
					if (removeOnlyProof) {
						await this._streamEntryStorage.set(streamEntry as AuditableItemStreamEntry);
					}
				}
			}
		} while (Is.stringValue(entriesResult.cursor));

		if (!removeOnlyProof) {
			for (const entryId of entryIds) {
				await this._streamEntryStorage.remove(entryId);
			}
		}
	}
}

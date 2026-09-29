// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HealthCategory, HealthStatus } from "@twin.org/api-models";
import { TenantIdContextIdHandler } from "@twin.org/api-tenant-processor";
import {
	AuditableItemStreamContexts,
	AuditableItemStreamTypes
} from "@twin.org/auditable-item-stream-models";
import {
	type BackgroundTask,
	BackgroundTaskService,
	initSchema as initSchemaBackgroundTask
} from "@twin.org/background-task-service";
import {
	ContextIdHandlerFactory,
	ContextIdKeys,
	ContextIdStore,
	type IContextIds
} from "@twin.org/context";
import {
	BaseError,
	ComponentFactory,
	Converter,
	Is,
	ObjectHelper,
	RandomHelper,
	SharedStore
} from "@twin.org/core";
import { ComparisonOperator, SortDirection } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { DidContextIdHandler } from "@twin.org/identity-models";
import type { IImmutableProof } from "@twin.org/immutable-proof-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import { ModuleHelper } from "@twin.org/modules";
import { nameof } from "@twin.org/nameof";
import {
	EntityStorageNotarizationConnector,
	initSchema as initSchemaNotarization,
	type Notarization
} from "@twin.org/notarization-connector-entity-storage";
import { NotarizationConnectorFactory } from "@twin.org/notarization-models";
import { SchemaOrgContexts } from "@twin.org/standards-schema-org";
import {
	cleanupTestEnv,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_ORGANIZATION_IDENTITY,
	TEST_TENANT_IDENTITY,
	TEST_USER_IDENTITY
} from "./setupTestEnv.js";
import { AuditableItemStreamService } from "../src/auditableItemStreamService.js";
import type { AuditableItemStream } from "../src/entities/auditableItemStream.js";
import type { AuditableItemStreamEntry } from "../src/entities/auditableItemStreamEntry.js";
import { initSchema } from "../src/schema.js";

let streamStorage: MemoryEntityStorageConnector<AuditableItemStream>;
let streamEntryStorage: MemoryEntityStorageConnector<AuditableItemStreamEntry>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let notarizationStorage: MemoryEntityStorageConnector<Notarization>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;
let backgroundTaskService: BackgroundTaskService | undefined;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;
const STREAM_ID_REGEX = /^ais:[^:]+$/;
const STREAM_ENTRY_ID_REGEX = /^ais:[^:]+:[^:]+$/;

/**
 * Expect stream id to be in ais:... format.
 * @param streamId The stream id to validate.
 */
function expectStreamIdFormat(streamId: string): void {
	expect(streamId).toMatch(STREAM_ID_REGEX);
}

/**
 * Expect stream entry id to be in ais:...:... format.
 * @param streamEntryId The stream entry id to validate.
 */
function expectStreamEntryIdFormat(streamEntryId: string): void {
	expect(streamEntryId).toMatch(STREAM_ENTRY_ID_REGEX);
}

/**
 * Wait for the proof to be generated.
 * @param proofCount The number of proofs to wait for.
 */
async function waitForProofGeneration(proofCount: number = 1): Promise<void> {
	let count = 0;
	do {
		await new Promise(resolve => setTimeout(resolve, 200));
	} while ((await notarizationStorage.getStore()).length < proofCount && count++ < proofCount * 40);
}

/**
 * Expect the immutable proof to have the correct structure and values.
 * @param immutableProof The proof to check.
 * @param created The expected created value of the proof.
 */
function expectImmutableProof(immutableProof: IImmutableProof, created: string): void {
	expect(immutableProof).toMatchObject({
		"@context": "https://w3id.org/security/data-integrity/v2",
		type: "DataIntegrityProof",
		created,
		cryptosuite: "eddsa-jcs-2022",
		proofPurpose: "assertionMethod"
	});

	const proofValue = (immutableProof as unknown as { proofValue?: unknown }).proofValue;
	expect(typeof proofValue).toBe("string");
	expect((proofValue as string).length).toBeGreaterThan(0);
	// base58btc encoded values typically start with 'z'
	expect(proofValue).toMatch(/^z[1-9A-HJ-NP-Za-km-z]+$/);
}

/**
 * Decode the immutable proof from the notarization.
 * @param notarization The notarization containing the proof.
 * @returns The decoded immutable proof.
 */
function decodeImmutableProofFromNotarization(notarization: Notarization): IImmutableProof {
	return ObjectHelper.fromBytes<IImmutableProof>(Converter.base64ToBytes(notarization.data));
}

/**
 * Get the stream entity id from the stream id.
 * @param streamId The stream id.
 * @returns The stream entity id.
 */
function getStreamEntityId(streamId: string): string {
	expectStreamIdFormat(streamId);
	return streamId.slice(4);
}

/**
 * Get the entry id from the stream id and entry entity id.
 * @param streamId The stream id.
 * @param entryEntityId The entry entity id.
 * @returns The entry id.
 */
function getEntryId(streamId: string, entryEntityId: string): string {
	expectStreamIdFormat(streamId);
	const fullEntryId = `${streamId}:${entryEntityId}`;
	expectStreamEntryIdFormat(fullEntryId);
	return fullEntryId;
}

describe("AuditableItemStreamService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaNotarization();
		initSchemaImmutableProof();
		initSchemaBackgroundTask();

		ContextIdHandlerFactory.register(ContextIdKeys.Node, () => new DidContextIdHandler());
		ContextIdHandlerFactory.register(ContextIdKeys.Tenant, () => new TenantIdContextIdHandler());
		ContextIdHandlerFactory.register(ContextIdKeys.Organization, () => new DidContextIdHandler());
		ContextIdHandlerFactory.register(ContextIdKeys.User, () => new DidContextIdHandler());

		ContextIdStore.getContextIds = vi.fn().mockImplementation(() => ({
			[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
			[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY,
			[ContextIdKeys.Organization]: TEST_ORGANIZATION_IDENTITY,
			[ContextIdKeys.User]: TEST_USER_IDENTITY
		}));

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine.
		// terminate() awaits all in-flight tasks so stop() drains them before teardown, preventing cross-test leaks.
		ModuleHelper.execModuleMethodThreadMessage = vi.fn().mockImplementation((module, completed) => {
			const inFlight: Promise<void>[] = [];
			return {
				executeMethod: (method: string, args?: unknown, contextIds?: IContextIds): void => {
					const task = (async () => {
						const res = await ModuleHelper.execModuleMethod(module, method, args as unknown[]);
						completed(method, res);
					})();
					inFlight.push(task);
				},
				terminate: vi.fn().mockImplementation(async () => {
					await Promise.allSettled(inFlight);
				})
			};
		});
	});

	afterAll(async () => {
		await cleanupTestEnv();
	});

	afterEach(async () => {
		if (backgroundTaskService) {
			await backgroundTaskService.stop();
			backgroundTaskService = undefined;
		}

		await notarizationStorage.teardown();
		await streamStorage.teardown();
		await streamEntryStorage.teardown();
		await immutableProofStorage.teardown();
		await backgroundTaskStorage.teardown();
	});

	beforeEach(async () => {
		streamStorage = new MemoryEntityStorageConnector<AuditableItemStream>({
			entitySchema: nameof<AuditableItemStream>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auditable-item-stream" }
		});

		streamEntryStorage = new MemoryEntityStorageConnector<AuditableItemStreamEntry>({
			entitySchema: nameof<AuditableItemStreamEntry>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auditable-item-stream-entry" }
		});

		EntityStorageConnectorFactory.register("auditable-item-stream", () => streamStorage);
		EntityStorageConnectorFactory.register("auditable-item-stream-entry", () => streamEntryStorage);

		notarizationStorage = new MemoryEntityStorageConnector<Notarization>({
			entitySchema: nameof<Notarization>(),
			config: { storageKey: "notarization" }
		});
		EntityStorageConnectorFactory.register("notarization", () => notarizationStorage);

		NotarizationConnectorFactory.register(
			"notarization",
			() => new EntityStorageNotarizationConnector()
		);

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "immutable-proof" }
		});

		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>(),
			config: { storageKey: "background-task" }
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const currentBackgroundTaskService = new BackgroundTaskService();
		backgroundTaskService = currentBackgroundTaskService;
		ComponentFactory.register("background-task", () => currentBackgroundTaskService);
		await currentBackgroundTaskService.start();

		ComponentFactory.register("platform", () => ({
			className: () => "MockPlatform",
			isMultiTenant: () => false,
			execute: async (method: () => Promise<void>) => method(),
			getLocalOriginContext: async () => undefined
		}));

		ComponentFactory.register("task-scheduler", () => ({
			className: () => "task-scheduler",
			addTask: async (taskId: string, times: unknown, taskCallback: () => Promise<void>) => {
				await taskCallback();
			},
			removeTask: async () => {},
			tasksInfo: async () => ({ tasks: {} })
		}));

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);
		await immutableProofService.start();

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);

		let idCounter = 1;
		RandomHelper.generate = vi
			.fn()
			.mockImplementation(length => new Uint8Array(length).fill(idCounter++));
	});

	test("Can create an instance of the service", async () => {
		const service = new AuditableItemStreamService();
		expect(service).toBeDefined();
	});

	test("Can create a stream with no data", async () => {
		const service = new AuditableItemStreamService();

		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		expectStreamIdFormat(streamId);

		const streamStore = await streamStorage.getStore();

		expect(streamStore).toMatchObject([
			{
				id: "019179f0e5af71018101010101010101",
				dateModified: "2024-08-22T11:56:56.272Z",
				organizationIdentity: TEST_ORGANIZATION_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				immutableInterval: 10,
				numberOfItems: 0,
				proofId: "immutable-proof:019179f26c5072028202020202020202"
			}
		]);

		const entryStore = await streamEntryStorage.getStore();
		expect(entryStore.length).toEqual(0);

		await waitForProofGeneration();

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toHaveLength(1);
		expect(notarizationStore[0]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expect(typeof notarizationStore[0].data).toBe("string");

		const immutableProof = decodeImmutableProofFromNotarization(notarizationStore[0]);
		expectImmutableProof(immutableProof, "2024-08-22T11:56:56.272Z");
	});

	test("Can create a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		expectStreamIdFormat(streamId);

		const streamStore = await streamStorage.getStore();
		const streamEntityId = getStreamEntityId(streamId);

		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});

		const entryStore = await streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(2);
		expect(entryStore[0]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			proofId: "immutable-proof:019179f26c5075058505050505050505",
			userIdentity: TEST_USER_IDENTITY,
			index: 0
		});
		expect(entryStore[1]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 2"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 1
		});
		expect(entryStore[0].id).not.toEqual(entryStore[1].id);

		await waitForProofGeneration(2);

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toHaveLength(2);
		expect(notarizationStore[0]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expect(notarizationStore[1]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});

		const immutableProof = decodeImmutableProofFromNotarization(notarizationStore[0]);
		expectImmutableProof(immutableProof, "2024-08-22T11:56:56.272Z");

		const immutableProofEntry = decodeImmutableProofFromNotarization(notarizationStore[1]);
		expectImmutableProof(immutableProofEntry, "2024-08-22T11:56:56.272Z");
	});

	test("Can create a stream with a single object and multiple entries with no immutability", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/"
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			},
			immutableInterval: 0
		});

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 0,
			numberOfItems: 2
		});

		const entryStore = await streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(2);
		expect(entryStore[0]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 0
		});
		expect(entryStore[1]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 2"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 1
		});
		expect(entryStore[0].id).not.toEqual(entryStore[1].id);

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toEqual([]);
	});

	test("Can get a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		await waitForProofGeneration(2);
		const entryStore = await streamEntryStorage.getStore();
		const entryId0 = entryStore[0]?.id;
		const entryId1 = entryStore[1]?.id;

		const result = await service.get(streamId, undefined, undefined, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		expect(result.stream["@context"]).toEqual(
			expect.arrayContaining([
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			])
		);
		expect(result.stream).toMatchObject({
			id: streamId,
			type: AuditableItemStreamTypes.Stream,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202",
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			verification: {
				type: "ImmutableProofVerification",
				verified: true
			},
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY
		});

		const resultEntries = Array.isArray(result.stream.entries)
			? result.stream.entries[0]
			: result.stream.entries;
		expect(resultEntries).toEqual({
			type: "ItemList",
			itemListElement: [
				{
					type: AuditableItemStreamTypes.StreamEntry,
					id: getEntryId(streamId, entryId0),
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId: "immutable-proof:019179f26c5075058505050505050505",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					index: 0,
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: AuditableItemStreamTypes.StreamEntry,
					id: getEntryId(streamId, entryId1),
					dateCreated: "2024-08-22T11:56:56.272Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					index: 1,
					userIdentity: TEST_USER_IDENTITY
				}
			]
		});

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toHaveLength(2);
		expect(notarizationStore[0]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expect(notarizationStore[1]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});

		const immutableProof = decodeImmutableProofFromNotarization(notarizationStore[0]);
		expectImmutableProof(immutableProof, "2024-08-22T11:56:56.272Z");

		const immutableProofEntry = decodeImmutableProofFromNotarization(notarizationStore[1]);
		expectImmutableProof(immutableProofEntry, "2024-08-22T11:56:56.272Z");
	});

	test("Can get a stream with a single object and multiple entries, including entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		await waitForProofGeneration(2);

		const result = await service.get(streamId, undefined, undefined, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});

		const entryStore = await streamEntryStorage.getStore();
		const entryId0 = entryStore[0]?.id;
		const entryId1 = entryStore[1]?.id;

		expect(result.stream["@context"]).toEqual(
			expect.arrayContaining([
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			])
		);
		expect(result.stream).toMatchObject({
			id: streamId,
			type: AuditableItemStreamTypes.Stream,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202",
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			verification: {
				type: "ImmutableProofVerification",
				verified: true
			},
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY
		});

		const resultEntries = Array.isArray(result.stream.entries)
			? result.stream.entries[0]
			: result.stream.entries;
		expect(resultEntries).toEqual({
			type: "ItemList",
			itemListElement: [
				{
					id: getEntryId(streamId, entryId0),
					type: AuditableItemStreamTypes.StreamEntry,
					dateCreated: "2024-08-22T11:56:56.272Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					index: 0,
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					proofId: "immutable-proof:019179f26c5075058505050505050505",
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: AuditableItemStreamTypes.StreamEntry,
					id: getEntryId(streamId, entryId1),
					dateCreated: "2024-08-22T11:56:56.272Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					index: 1,
					userIdentity: TEST_USER_IDENTITY
				}
			]
		});
	});

	test("Can get a stream entries page with limit and cursor in most recent first order", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		const firstEntryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "Oldest entry"
		});
		const secondEntryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "Middle entry"
		});
		const thirdEntryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "Newest entry"
		});

		const entryStore = await streamEntryStorage.getStore();
		await streamEntryStorage.set({
			...entryStore[0],
			dateCreated: new Date(FIRST_TICK).toISOString()
		});
		await streamEntryStorage.set({
			...entryStore[1],
			dateCreated: new Date(SECOND_TICK).toISOString()
		});
		await streamEntryStorage.set({
			...entryStore[2],
			dateCreated: new Date(SECOND_TICK + 1000).toISOString()
		});

		await waitForProofGeneration(4);

		const firstPage = await service.get(streamId, undefined, 2, {
			includeEntries: true
		});

		expect(firstPage.cursor).toBeDefined();

		const firstPageEntries = Array.isArray(firstPage.stream.entries)
			? firstPage.stream.entries[0]
			: firstPage.stream.entries;

		expect(firstPageEntries.type).toBe("ItemList");
		expect(firstPageEntries.itemListElement).toHaveLength(2);
		expect(firstPageEntries.itemListElement).toMatchObject([
			{
				id: thirdEntryId,
				type: AuditableItemStreamTypes.StreamEntry,
				dateCreated: new Date(SECOND_TICK + 1000).toISOString(),
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "Newest entry"
				},
				index: 2,
				userIdentity: TEST_USER_IDENTITY
			},
			{
				id: secondEntryId,
				type: AuditableItemStreamTypes.StreamEntry,
				dateCreated: new Date(SECOND_TICK).toISOString(),
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "Middle entry"
				},
				index: 1,
				userIdentity: TEST_USER_IDENTITY
			}
		]);

		const secondPage = await service.get(streamId, firstPage.cursor, 2, {
			includeEntries: true
		});

		const secondPageEntries = Array.isArray(secondPage.stream.entries)
			? secondPage.stream.entries[0]
			: secondPage.stream.entries;

		expect(secondPage.cursor).toBeUndefined();
		expect(secondPageEntries.type).toBe("ItemList");
		expect(secondPageEntries.itemListElement).toHaveLength(1);
		expect(secondPageEntries.itemListElement).toMatchObject([
			{
				id: firstEntryId,
				type: AuditableItemStreamTypes.StreamEntry,
				dateCreated: new Date(FIRST_TICK).toISOString(),
				entryObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: "Oldest entry"
				},
				index: 0,
				userIdentity: TEST_USER_IDENTITY
			}
		]);
	});

	test("Can update a stream with a single object and multiple entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		const result = await service.get(streamId);

		await service.update({
			...result.stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note xxx"
			}
		});

		await waitForProofGeneration(2);

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note xxx"
			},
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});

		const entryStore = await streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(2);
		expect(entryStore[0]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			proofId: "immutable-proof:019179f26c5075058505050505050505",
			userIdentity: TEST_USER_IDENTITY,
			index: 0
		});
		expect(entryStore[1]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 2"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 1
		});
		expect(entryStore[0].id).not.toEqual(entryStore[1].id);

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toHaveLength(2);
		expect(notarizationStore[0]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expect(notarizationStore[1]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expectImmutableProof(
			decodeImmutableProofFromNotarization(notarizationStore[0]),
			"2024-08-22T11:56:56.272Z"
		);
		expectImmutableProof(
			decodeImmutableProofFromNotarization(notarizationStore[1]),
			"2024-08-22T11:56:56.272Z"
		);
	});

	test("Returns error when creating stream without organization identity in context", async () => {
		const service = new AuditableItemStreamService();

		vi.mocked(ContextIdStore.getContextIds).mockImplementationOnce(async () => ({
			[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
			[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY,
			[ContextIdKeys.User]: TEST_USER_IDENTITY
		}));

		await expect(
			service.create({
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: AuditableItemStreamTypes.Stream
			})
		).rejects.toMatchObject({
			source: "ContextIdHelper",
			properties: { key: ContextIdKeys.Organization }
		});
	});

	test("Does not recreate proof on update if proof already exists", async () => {
		const service = new AuditableItemStreamService();

		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		expectStreamIdFormat(streamId);

		await waitForProofGeneration();

		const proofIdBefore = (await streamStorage.getStore())[0].proofId;
		expect(proofIdBefore).toBeDefined();
		expect(await notarizationStorage.getStore()).toHaveLength(1);

		// Update with no annotation change - proof already exists and org identity is set
		const result = await service.get(streamId);
		await service.update({ ...result.stream });

		expect((await streamStorage.getStore())[0].proofId).toBe(proofIdBefore);
		expect(await notarizationStorage.getStore()).toHaveLength(1);
	});

	test("Can add a stream entry to an existing stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		const createdEntryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "This is an entry note 3"
		});
		expectStreamEntryIdFormat(createdEntryId);

		await waitForProofGeneration();

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = await streamStorage.getStore();

		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			numberOfItems: 3,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});

		await waitForProofGeneration(2);

		const entryStore = await streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(3);
		expect(entryStore[0]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			proofId: "immutable-proof:019179f26c5075058505050505050505",
			userIdentity: TEST_USER_IDENTITY,
			index: 0
		});
		expect(entryStore[1]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 2"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 1
		});
		expect(entryStore[2]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 3"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 2
		});
		expect(entryStore[0].id).not.toEqual(entryStore[1].id);
		expect(entryStore[1].id).not.toEqual(entryStore[2].id);

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toHaveLength(2);
		expect(notarizationStore[0]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expect(notarizationStore[1]).toMatchObject({
			mode: "locked",
			transferLockUntilDestroyed: true,
			controllerIdentity: TEST_ORGANIZATION_IDENTITY,
			owner: TEST_ORGANIZATION_IDENTITY
		});
		expectImmutableProof(
			decodeImmutableProofFromNotarization(notarizationStore[0]),
			"2024-08-22T11:56:56.272Z"
		);
		expectImmutableProof(
			decodeImmutableProofFromNotarization(notarizationStore[1]),
			"2024-08-22T11:56:56.272Z"
		);
	});

	test("Can close a stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		await service.close(streamId);

		const stream = await service.get(streamId);
		expect(stream.stream.closed).toBe(true);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0].closed).toBe(true);
	});

	test("Keeps mode undefined when not provided", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		const stream = await service.get(streamId);
		expect(stream.stream.mode).toBeUndefined();

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0].mode).toBeUndefined();
	});

	test("Can create a stream with mode set to default", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			mode: "default"
		});

		const stream = await service.get(streamId);
		expect(stream.stream.mode).toBe("default");

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0].mode).toBe("default");
	});

	test("Returns createFailed when creating closed stream without entries", async () => {
		const service = new AuditableItemStreamService();

		await expect(
			service.create({
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: AuditableItemStreamTypes.Stream,
				closed: true
			})
		).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.createFailed"
					}),
					expect.objectContaining({
						message: "auditableItemStreamService.closedRequiresEntries"
					})
				])
			);

			return true;
		});
	});

	test("Can create a closed stream when entries are provided", async () => {
		const service = new AuditableItemStreamService();

		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			closed: true,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "Closed from create"
						}
					}
				]
			}
		});

		const stream = await service.get(streamId);
		expect(stream.stream.closed).toBe(true);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0].closed).toBe(true);

		await expect(
			service.createEntry(streamId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "Should fail for closed stream"
			})
		).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.creatingEntryFailed"
					}),
					expect.objectContaining({
						message: "auditableItemStreamService.streamClosed"
					})
				])
			);
			return true;
		});
	});

	test("Returns updatingEntryFailed in append-only mode when updating entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			mode: "append-only"
		});

		const entryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "Initial"
		});

		await expect(
			service.updateEntry(streamId, entryId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "Updated"
			})
		).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.updatingEntryFailed"
					}),
					expect.objectContaining({
						message: "auditableItemStreamService.appendOnlyNoEntryUpdates"
					})
				])
			);
			return true;
		});
	});

	test("Returns removingEntryFailed in append-only mode when removing entries", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			mode: "append-only"
		});

		const entryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "Initial"
		});

		await expect(service.removeEntry(streamId, entryId)).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.removingEntryFailed"
					}),
					expect.objectContaining({
						message: "auditableItemStreamService.appendOnlyNoEntryRemovals"
					})
				])
			);
			return true;
		});
	});

	test("Returns creatingEntryFailed when adding entry to closed stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		await service.close(streamId);

		await expect(
			service.createEntry(streamId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "Should fail"
			})
		).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.creatingEntryFailed"
					}),
					expect.objectContaining({
						message: "auditableItemStreamService.streamClosed"
					})
				])
			);
			return true;
		});
	});

	test("Returns updatingEntryFailed when updating entry in closed stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});

		const entryId = await service.createEntry(streamId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "Before close"
		});

		await service.close(streamId);

		await expect(
			service.updateEntry(streamId, entryId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "After close"
			})
		).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.updatingEntryFailed"
					}),
					expect.objectContaining({
						message: "auditableItemStreamService.streamClosed"
					})
				])
			);
			return true;
		});
	});

	test("Can add multiple stream entries and expect more immutable checks", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		for (let i = 0; i < 10; i++) {
			await service.createEntry(streamId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: `This is an entry note ${i + 3}`
			});
		}

		await waitForProofGeneration(3);

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = await streamStorage.getStore();

		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			numberOfItems: 12,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});

		const entryStore = await streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(12);

		const notarizationStore = await notarizationStorage.getStore();
		expect(notarizationStore).toHaveLength(3);
	});

	test("Can get an entry from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const stream = await service.get(streamId, undefined, undefined, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});
		const streamEntries = Array.isArray(stream.stream.entries)
			? stream.stream.entries[0]?.itemListElement
			: stream.stream.entries?.itemListElement;

		const entry = await service.getEntry(streamId, streamEntries?.[0]?.id ?? "", {
			verifyEntry: true
		});
		const streamEntityId = getStreamEntityId(streamId);
		const entryId = streamEntries?.[0]?.id;
		expect(entryId).toBeDefined();
		expectStreamEntryIdFormat(entryId ?? "");

		expect(entry).toEqual({
			"@context": [
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: AuditableItemStreamTypes.StreamEntry,
			id: entryId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			proofId: streamEntries?.[0]?.proofId,
			userIdentity: TEST_USER_IDENTITY,
			index: 0,
			verification: {
				type: "ImmutableProofVerification",
				verified: true
			}
		});

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});
	});

	test("Can get an entry object from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		const result = await service.get(streamId, undefined, undefined, {
			includeEntries: true,
			verifyStream: true,
			verifyEntries: true
		});
		const streamEntries = Array.isArray(result.stream.entries)
			? result.stream.entries[0]?.itemListElement
			: result.stream.entries?.itemListElement;
		expect(streamEntries?.[0]?.id).toBeDefined();
		expectStreamEntryIdFormat(streamEntries?.[0]?.id ?? "");

		const entry = await service.getEntryObject(streamId, streamEntries?.[0]?.id ?? "");

		expect(entry).toEqual({
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "This is an entry note 1"
		});

		const streamStore = await streamStorage.getStore();
		const streamEntityId = getStreamEntityId(streamId);
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});
	});

	test("Pages entries with includeDeleted without repeating the first page", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "paged entry 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "paged entry 2"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "paged entry 3"
						}
					}
				]
			}
		});

		const all = await service.getEntries(streamId, { includeDeleted: true });
		const allElements = all.entries.itemListElement ?? [];
		expect(allElements).toHaveLength(3);

		await service.removeEntry(streamId, allElements[0].id);

		const collected: string[] = [];
		let cursor: string | undefined;
		let pages = 0;

		do {
			const page = await service.getEntries(streamId, {
				includeDeleted: true,
				limit: 1,
				cursor
			});
			const elements = page.entries.itemListElement ?? [];
			expect(elements).toHaveLength(1);
			collected.push(elements[0].id);
			cursor = page.cursor;
			pages++;
		} while (Is.stringValue(cursor) && pages < 10);

		// Without carrying the flag separately from the storage cursor this loops on page one.
		expect(pages).toEqual(3);
		expect(new Set(collected).size).toEqual(3);
	});

	test("Can delete an entry from the stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		const result = await service.get(streamId, undefined, undefined, { includeEntries: true });
		const streamEntries = Array.isArray(result.stream.entries)
			? result.stream.entries[0]?.itemListElement
			: result.stream.entries?.itemListElement;
		expect(streamEntries?.[0]?.id).toBeDefined();
		expectStreamEntryIdFormat(streamEntries?.[0]?.id ?? "");

		await service.removeEntry(streamId, streamEntries?.[0]?.id ?? "");

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 10,
			numberOfItems: 2,
			proofId: "immutable-proof:019179f26c5072028202020202020202"
		});

		const entryStore = await streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(2);
		expect(entryStore[0].dateDeleted).toEqual("2024-08-22T11:56:56.272Z");

		const streamWithoutDeleted = await service.get(streamId, undefined, undefined, {
			includeEntries: true
		});
		const streamWithoutDeletedEntries = Array.isArray(streamWithoutDeleted.stream.entries)
			? streamWithoutDeleted.stream.entries[0]?.itemListElement
			: streamWithoutDeleted.stream.entries?.itemListElement;
		expect(streamWithoutDeletedEntries).toHaveLength(1);

		const streamWithDeleted = await service.get(streamId, undefined, undefined, {
			includeEntries: true,
			includeDeleted: true
		});
		const streamWithDeletedEntries = Array.isArray(streamWithDeleted.stream.entries)
			? streamWithDeleted.stream.entries[0]?.itemListElement
			: streamWithDeleted.stream.entries?.itemListElement;
		expect(streamWithDeletedEntries).toHaveLength(2);
	});

	test("Can delete the proof from a stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/"
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			},
			immutableInterval: 1
		});

		await service.removeProof(streamId);

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			id: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			organizationIdentity: TEST_ORGANIZATION_IDENTITY,
			userIdentity: TEST_USER_IDENTITY,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			immutableInterval: 1,
			numberOfItems: 2
		});

		const streamEntryStore = await streamEntryStorage.getStore();
		expect(streamEntryStore).toHaveLength(2);
		expect(streamEntryStore[0]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 0
		});
		expect(streamEntryStore[1]).toMatchObject({
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 2"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 1
		});
		expect((streamEntryStore[0] as { proofId?: unknown }).proofId).toBeUndefined();
		expect((streamEntryStore[1] as { proofId?: unknown }).proofId).toBeUndefined();
	});

	test("Can delete a stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		await service.remove(streamId);

		const streamStore = await streamStorage.getStore();
		expect(streamStore).toEqual([]);

		const entryStore = await streamEntryStorage.getStore();
		expect(entryStore).toEqual([]);
	});

	test("Can get entries from a stream", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		await waitForProofGeneration(2);

		await service.get(streamId, undefined, undefined, { includeEntries: true });

		const entriesAndCursor = await service.getEntries(streamId, { verifyEntries: true });
		const entryStore = await streamEntryStorage.getStore();

		expect(entriesAndCursor.entries).toEqual({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon,
				"https://schema.twindev.org/immutable-proof/"
			],
			type: ["ItemList", "AuditableItemStreamEntryList"],
			itemListElement: [
				{
					type: AuditableItemStreamTypes.StreamEntry,
					id: getEntryId(streamId, entryStore[0].id),
					dateCreated: "2024-08-22T11:56:56.272Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 1"
					},
					proofId: "immutable-proof:019179f26c5075058505050505050505",
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					},
					index: 0,
					userIdentity: TEST_USER_IDENTITY
				},
				{
					type: AuditableItemStreamTypes.StreamEntry,
					dateCreated: "2024-08-22T11:56:56.272Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					id: getEntryId(streamId, entryStore[1].id),
					index: 1,
					userIdentity: TEST_USER_IDENTITY
				}
			]
		});
	});

	test("Can get entries from a stream using sub object", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is a simple note"
			},
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 1"
						}
					},
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "This is an entry note 2"
						}
					}
				]
			}
		});

		await service.get(streamId, undefined, undefined, { includeEntries: true });

		const entriesAndCursor = await service.getEntries(streamId, {
			verifyEntries: true,
			conditions: {
				conditions: [
					{
						property: "entryObject.@type",
						comparison: ComparisonOperator.Equals,
						value: "Note"
					},
					{
						property: "entryObject.content",
						comparison: ComparisonOperator.Equals,
						value: "This is an entry note 2"
					}
				]
			}
		});
		const entryStore = await streamEntryStorage.getStore();

		expect(entriesAndCursor.entries).toEqual({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon,
				"https://schema.twindev.org/immutable-proof/"
			],
			type: ["ItemList", "AuditableItemStreamEntryList"],
			itemListElement: [
				{
					type: AuditableItemStreamTypes.StreamEntry,
					id: getEntryId(streamId, entryStore[1].id),
					dateCreated: "2024-08-22T11:56:56.272Z",
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This is an entry note 2"
					},
					index: 1,
					userIdentity: TEST_USER_IDENTITY
				}
			]
		});
	});

	test("Can get entries without a stream id", async () => {
		const service = new AuditableItemStreamService();

		await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "Entry from stream 1"
						}
					}
				]
			}
		});

		await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "Entry from stream 2"
						}
					}
				]
			}
		});

		const entriesAndCursor = await service.getEntries(undefined, {
			conditions: {
				conditions: [
					{
						property: "entryObject.@type",
						comparison: ComparisonOperator.Equals,
						value: "Note"
					}
				]
			}
		});

		expect(entriesAndCursor.entries["@context"]).toEqual([
			SchemaOrgContexts.Context,
			AuditableItemStreamContexts.Context,
			AuditableItemStreamContexts.ContextCommon
		]);
		expect(entriesAndCursor.entries.type).toEqual(["ItemList", "AuditableItemStreamEntryList"]);
		expect(entriesAndCursor.entries.itemListElement).toHaveLength(2);
		for (const entry of entriesAndCursor.entries.itemListElement) {
			expectStreamEntryIdFormat(entry.id);
		}
		expect(entriesAndCursor.entries.itemListElement).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: AuditableItemStreamTypes.StreamEntry,
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "Entry from stream 1"
					}
				}),
				expect.objectContaining({
					type: AuditableItemStreamTypes.StreamEntry,
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "Entry from stream 2"
					}
				})
			])
		);
	});

	test("Can get entry objects without a stream id", async () => {
		const service = new AuditableItemStreamService();

		await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "Object from stream 1"
						}
					}
				]
			}
		});

		await service.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry,
						entryObject: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Note",
							content: "Object from stream 2"
						}
					}
				]
			}
		});

		const entriesAndCursor = await service.getEntryObjects();

		expect(entriesAndCursor.entries["@context"]).toEqual([
			SchemaOrgContexts.Context,
			AuditableItemStreamContexts.Context,
			AuditableItemStreamContexts.ContextCommon
		]);
		expect(entriesAndCursor.entries.type).toEqual([
			"ItemList",
			"AuditableItemStreamEntryObjectList"
		]);
		expect(entriesAndCursor.entries.itemListElement).toHaveLength(2);
		expect(entriesAndCursor.entries.itemListElement).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "https://www.w3.org/ns/activitystreams#Note",
					"https://www.w3.org/ns/activitystreams#content": "Object from stream 1"
				}),
				expect.objectContaining({
					type: "https://www.w3.org/ns/activitystreams#Note",
					"https://www.w3.org/ns/activitystreams#content": "Object from stream 2"
				})
			])
		);
	});

	test("Can paginate entries without a stream id", async () => {
		const service = new AuditableItemStreamService();

		for (let i = 1; i <= 3; i++) {
			await service.create({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/ais/",
					"https://schema.twindev.org/common/"
				],
				type: AuditableItemStreamTypes.Stream,
				entries: {
					type: "ItemList",
					itemListElement: [
						{
							type: AuditableItemStreamTypes.StreamEntry,
							entryObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Note",
								content: `Paged entry ${i}`
							}
						}
					]
				}
			});
		}

		const firstPage = await service.getEntries(undefined, {
			limit: 2,
			order: SortDirection.Ascending
		});

		expect(firstPage.entries.itemListElement).toHaveLength(2);
		for (const entry of firstPage.entries.itemListElement) {
			expectStreamEntryIdFormat(entry.id);
		}
		expect(firstPage.cursor).toBeDefined();

		const secondPage = await service.getEntries(undefined, {
			limit: 2,
			order: SortDirection.Ascending,
			cursor: firstPage.cursor
		});

		expect(secondPage.entries.itemListElement).toHaveLength(1);
		for (const entry of secondPage.entries.itemListElement) {
			expectStreamEntryIdFormat(entry.id);
		}

		const allContents = [
			...firstPage.entries.itemListElement,
			...secondPage.entries.itemListElement
		].map(entry => entry.entryObject?.content);

		expect(allContents).toEqual(
			expect.arrayContaining(["Paged entry 1", "Paged entry 2", "Paged entry 3"])
		);
	});

	test("Can paginate entry objects without a stream id", async () => {
		const service = new AuditableItemStreamService();

		for (let i = 1; i <= 3; i++) {
			await service.create({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/ais/",
					"https://schema.twindev.org/common/"
				],
				type: AuditableItemStreamTypes.Stream,
				entries: {
					type: "ItemList",
					itemListElement: [
						{
							type: AuditableItemStreamTypes.StreamEntry,
							entryObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Note",
								content: `Paged object ${i}`
							}
						}
					]
				}
			});
		}

		const firstPage = await service.getEntryObjects(undefined, {
			limit: 2,
			order: SortDirection.Ascending
		});

		expect(firstPage.entries.itemListElement).toHaveLength(2);
		expect(firstPage.cursor).toBeDefined();

		const secondPage = await service.getEntryObjects(undefined, {
			limit: 2,
			order: SortDirection.Ascending,
			cursor: firstPage.cursor
		});

		expect(secondPage.entries.itemListElement).toHaveLength(1);

		const allContents = [
			...firstPage.entries.itemListElement,
			...secondPage.entries.itemListElement
		].map(entry => entry["https://www.w3.org/ns/activitystreams#content"]);

		expect(allContents).toEqual(
			expect.arrayContaining(["Paged object 1", "Paged object 2", "Paged object 3"])
		);
	});

	test("Can query a list of streams", async () => {
		const service = new AuditableItemStreamService();

		for (let i = 0; i < 5; i++) {
			await service.create({
				"@context": [
					"https://schema.org",
					"https://schema.twindev.org/ais/",
					"https://schema.twindev.org/common/"
				],
				type: AuditableItemStreamTypes.Stream,
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: `This is a simple note ${i + 1}`
				},
				entries: {
					type: "ItemList",
					itemListElement: [
						{
							type: AuditableItemStreamTypes.StreamEntry,
							entryObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Note",
								content: "This is an entry note 1"
							}
						},
						{
							type: AuditableItemStreamTypes.StreamEntry,
							entryObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Note",
								content: "This is an entry note 2"
							}
						}
					]
				}
			});
		}

		const resultAndCursor = await service.query();
		expect(resultAndCursor.entries["@context"]).toEqual([
			SchemaOrgContexts.Context,
			AuditableItemStreamContexts.Context,
			AuditableItemStreamContexts.ContextCommon
		]);
		expect(resultAndCursor.entries.type).toEqual(["ItemList", "AuditableItemStreamList"]);
		expect(resultAndCursor.entries.itemListElement).toHaveLength(5);

		for (let i = 0; i < 5; i++) {
			expect(resultAndCursor.entries.itemListElement[i]).toMatchObject({
				type: AuditableItemStreamTypes.Stream,
				dateCreated: "2024-08-22T11:56:56.272Z",
				dateModified: "2024-08-22T11:56:56.272Z",
				annotationObject: {
					"@context": "https://www.w3.org/ns/activitystreams",
					"@type": "Note",
					content: `This is a simple note ${i + 1}`
				}
			});
			expectStreamIdFormat(resultAndCursor.entries.itemListElement[i].id);
		}
	});

	test("Returns createFailed when stream schema validation fails", async () => {
		const service = new AuditableItemStreamService();

		const createObject = {
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			entries: {
				type: "ItemList",
				itemListElement: [
					{
						type: AuditableItemStreamTypes.StreamEntry
					}
				]
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as any;

		await expect(service.create(createObject)).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.createFailed"
					}),
					expect.objectContaining({
						message: "common.validation",
						properties: expect.objectContaining({
							validationFailures: expect.arrayContaining([
								expect.objectContaining({
									property: "stream.entries.itemListElement.0",
									reason: "validation.schemaFailed",
									properties: expect.objectContaining({
										params: expect.objectContaining({
											missingProperty: "entryObject"
										})
									})
								})
							])
						})
					})
				])
			);

			return true;
		});
	});

	test("Returns updatingFailed when stream schema validation fails", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/"
			],
			type: "AuditableItemStream",
			dateCreated: "2024-08-22T11:56:56.272Z"
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as any);

		const currentStream = await service.get(streamId);
		const invalidStreamForUpdate = currentStream.stream;
		invalidStreamForUpdate.entries = {
			type: "ItemList",
			itemListElement: [
				{
					type: AuditableItemStreamTypes.StreamEntry,
					entryObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: "This entry is intentionally incomplete"
					}
				}
			]
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as any;

		await expect(service.update(invalidStreamForUpdate)).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.updatingFailed"
					}),
					expect.objectContaining({
						message: "common.validation",
						properties: expect.objectContaining({
							validationFailures: expect.arrayContaining([
								expect.objectContaining({
									property: "stream.entries.itemListElement.0",
									reason: "validation.schemaFailed",
									properties: expect.objectContaining({
										params: expect.objectContaining({
											missingProperty: "id"
										})
									})
								})
							])
						})
					})
				])
			);
			return true;
		});
	});

	// ------------------------------------------------------------------ //
	// Concurrent mutating operations must not overwrite each other.      //
	// ------------------------------------------------------------------ //
	describe("concurrent operations on the same stream", () => {
		const PARALLEL_OPS = 10;

		beforeEach(() => {
			// Clear the Mutex registry so getOrFetchLock always processes a
			// fresh key - same pattern as the AIG / framework regression tests.
			SharedStore.set("mutexLocks", {});
		});

		test("parallel createEntry calls all persist - numberOfItems equals PARALLEL_OPS", async () => {
			const service = new AuditableItemStreamService();

			const streamId = await service.create({
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: AuditableItemStreamTypes.Stream,
				immutableInterval: 0
			});

			await Promise.all(
				Array.from({ length: PARALLEL_OPS }, async (unused, i) =>
					service.createEntry(streamId, {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: `Concurrent entry ${i}`
					})
				)
			);

			const result = await service.get(streamId);
			expect(result.stream.numberOfItems).toEqual(PARALLEL_OPS);
		});

		test("parallel createEntry calls all return distinct entry IDs", async () => {
			const service = new AuditableItemStreamService();

			const streamId = await service.create({
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: AuditableItemStreamTypes.Stream,
				immutableInterval: 0
			});

			const entryIds = await Promise.all(
				Array.from({ length: PARALLEL_OPS }, async (unused, i) =>
					service.createEntry(streamId, {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: `Distinct entry ${i}`
					})
				)
			);

			const uniqueIds = new Set(entryIds);
			expect(uniqueIds.size).toEqual(PARALLEL_OPS);
		});

		test("overlapping close() and createEntry() calls leave numberOfItems consistent", async () => {
			const service = new AuditableItemStreamService();

			const streamId = await service.create({
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Context,
					AuditableItemStreamContexts.ContextCommon
				],
				type: AuditableItemStreamTypes.Stream,
				immutableInterval: 0,
				entries: {
					type: "ItemList",
					itemListElement: [
						{
							type: AuditableItemStreamTypes.StreamEntry,
							entryObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Note",
								content: "Seed entry 1"
							}
						},
						{
							type: AuditableItemStreamTypes.StreamEntry,
							entryObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Note",
								content: "Seed entry 2"
							}
						}
					]
				}
			});

			const results = await Promise.allSettled([
				service.close(streamId),
				...Array.from({ length: PARALLEL_OPS }, async (unused, i) =>
					service.createEntry(streamId, {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Note",
						content: `Race entry ${i}`
					})
				)
			]);

			const succeeded = results.filter(r => r.status === "fulfilled").length;
			const stream = await service.get(streamId);

			// numberOfItems must match the number of operations that actually succeeded
			expect(stream.stream.numberOfItems).toEqual(succeeded - 1 + 2);
		});
	});

	test("Returns creatingEntryFailed when entry object validation fails", async () => {
		const service = new AuditableItemStreamService();
		const streamId = await service.create({
			"@context": [
				"https://schema.org",
				"https://schema.twindev.org/ais/",
				"https://schema.twindev.org/common/"
			],
			type: "AuditableItemStream",
			dateCreated: "2024-08-22T11:56:56.272Z"
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as any);

		const invalidEntryObject = {
			"@context": 123,
			"@type": 123,
			content: "Invalid entry"
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as unknown as any;

		await expect(service.createEntry(streamId, invalidEntryObject)).rejects.toSatisfy(error => {
			const flattened = BaseError.flatten(error);
			expect(flattened).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "auditableItemStreamService.creatingEntryFailed"
					}),
					expect.objectContaining({
						message: "jsonLdProcessor.jsonLdError",
						properties: expect.objectContaining({
							code: "invalid local context",
							context: [123]
						})
					})
				])
			);
			return true;
		});
	});

	describe("AuditableItemStreamService health checks", () => {
		beforeEach(() => {
			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY,
				[ContextIdKeys.Organization]: TEST_ORGANIZATION_IDENTITY,
				[ContextIdKeys.User]: TEST_USER_IDENTITY
			});
		});

		test("health check returns ok status when stream storage is accessible", async () => {
			const service = new AuditableItemStreamService();
			const results = await service.healthApplication(vi.fn());
			expect(results).toHaveLength(1);
			const result = results?.[0];
			expect(result?.category).toBe(HealthCategory.Application);
			expect(result?.status).toBe(HealthStatus.Ok);
		});

		test("health check returns ok status on repeated calls", async () => {
			const service = new AuditableItemStreamService();
			const results1 = await service.healthApplication(vi.fn());
			expect(results1?.[0].status).toBe(HealthStatus.Ok);
			const results2 = await service.healthApplication(vi.fn());
			expect(results2).toHaveLength(1);
			expect(results2?.[0].status).toBe(HealthStatus.Ok);
		});

		test("health check returns empty results without org context", async () => {
			ContextIdStore.getContextIds = vi.fn().mockReturnValue({
				[ContextIdKeys.Node]: TEST_NODE_IDENTITY,
				[ContextIdKeys.Tenant]: TEST_TENANT_IDENTITY
			});
			const service = new AuditableItemStreamService();
			const results = await service.healthApplication(vi.fn());
			expect(results).toHaveLength(0);
		});
	});
});

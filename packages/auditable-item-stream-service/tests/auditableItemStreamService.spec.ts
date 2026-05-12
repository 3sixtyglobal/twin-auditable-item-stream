// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
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
import { BaseError, ComponentFactory, Converter, ObjectHelper, RandomHelper } from "@twin.org/core";
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
import { SchemaOrgContexts } from "@twin.org/standards-schema-org";
import {
	EntityStorageVerifiableStorageConnector,
	initSchema as initSchemaVerifiableStorage,
	type VerifiableItem
} from "@twin.org/verifiable-storage-connector-entity-storage";
import { VerifiableStorageConnectorFactory } from "@twin.org/verifiable-storage-models";
import {
	cleanupTestEnv,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_ORGANIZATION_IDENTITY,
	TEST_TENANT_IDENTITY,
	TEST_TENANT_IDENTITY_SHORT,
	TEST_USER_IDENTITY
} from "./setupTestEnv.js";
import { AuditableItemStreamService } from "../src/auditableItemStreamService.js";
import type { AuditableItemStream } from "../src/entities/auditableItemStream.js";
import type { AuditableItemStreamEntry } from "../src/entities/auditableItemStreamEntry.js";
import { initSchema } from "../src/schema.js";

let streamStorage: MemoryEntityStorageConnector<AuditableItemStream>;
let streamEntryStorage: MemoryEntityStorageConnector<AuditableItemStreamEntry>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let verifiableStorage: MemoryEntityStorageConnector<VerifiableItem>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;

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
	} while (verifiableStorage.getStore().length < proofCount && count++ < proofCount * 40);
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
 * Decode the immutable proof from the verifiable item.
 * @param item The verifiable item containing the proof.
 * @returns The decoded immutable proof.
 */
function decodeImmutableProofFromVerifiableItem(item: VerifiableItem): IImmutableProof {
	return ObjectHelper.fromBytes<IImmutableProof>(Converter.base64ToBytes(item.data));
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
		initSchemaVerifiableStorage();
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

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine
		ModuleHelper.execModuleMethodThreadMessage = vi
			.fn()
			.mockImplementation((module, completed) => ({
				executeMethod: async (method: string, args?: unknown, contextIds?: IContextIds) => {
					const res = await ModuleHelper.execModuleMethod(module, method, args as unknown[]);
					completed(method, res);
				}
			}));
	});

	afterAll(async () => {
		await cleanupTestEnv();
	});

	beforeEach(async () => {
		streamStorage = new MemoryEntityStorageConnector<AuditableItemStream>({
			entitySchema: nameof<AuditableItemStream>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});

		streamEntryStorage = new MemoryEntityStorageConnector<AuditableItemStreamEntry>({
			entitySchema: nameof<AuditableItemStreamEntry>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});

		EntityStorageConnectorFactory.register("auditable-item-stream", () => streamStorage);
		EntityStorageConnectorFactory.register("auditable-item-stream-entry", () => streamEntryStorage);

		verifiableStorage = new MemoryEntityStorageConnector<VerifiableItem>({
			entitySchema: nameof<VerifiableItem>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});
		EntityStorageConnectorFactory.register("verifiable-item", () => verifiableStorage);

		VerifiableStorageConnectorFactory.register(
			"verifiable-storage",
			() => new EntityStorageVerifiableStorageConnector()
		);

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>(),
			partitionContextIds: [ContextIdKeys.Tenant]
		});

		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>()
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const backgroundTask = new BackgroundTaskService();
		ComponentFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start();

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);
		await immutableProofService.start();

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
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

		const streamStore = streamStorage.getStore();

		expect(streamStore).toMatchObject([
			{
				partitionId: TEST_TENANT_IDENTITY_SHORT,
				id: "019179f0e5af71018101010101010101",
				dateModified: "2024-08-22T11:56:56.272Z",
				organizationIdentity: TEST_ORGANIZATION_IDENTITY,
				userIdentity: TEST_USER_IDENTITY,
				immutableInterval: 10,
				numberOfItems: 0,
				proofId: "immutable-proof:019179f26c5072028202020202020202"
			}
		]);

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore.length).toEqual(0);

		await waitForProofGeneration();

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(1);
		expect(verifiableStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			maxAllowListSize: 100
		});
		expect(typeof verifiableStore[0].data).toBe("string");

		const immutableProof = decodeImmutableProofFromVerifiableItem(verifiableStore[0]);
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

		const streamStore = streamStorage.getStore();
		const streamEntityId = getStreamEntityId(streamId);

		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(2);
		expect(entryStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(2);
		expect(verifiableStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0909090909090909090909090909090909090909090909090909090909090909",
			maxAllowListSize: 100
		});
		expect(verifiableStore[1]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
			maxAllowListSize: 100
		});

		const immutableProof = decodeImmutableProofFromVerifiableItem(verifiableStore[0]);
		expectImmutableProof(immutableProof, "2024-08-22T11:56:56.272Z");

		const immutableProofEntry = decodeImmutableProofFromVerifiableItem(verifiableStore[1]);
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

		const streamStore = streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(2);
		expect(entryStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toEqual([]);
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
		const entryStore = streamEntryStorage.getStore();
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

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(2);
		expect(verifiableStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0909090909090909090909090909090909090909090909090909090909090909",
			maxAllowListSize: 100
		});
		expect(verifiableStore[1]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
			maxAllowListSize: 100
		});

		const immutableProof = decodeImmutableProofFromVerifiableItem(verifiableStore[0]);
		expectImmutableProof(immutableProof, "2024-08-22T11:56:56.272Z");

		const immutableProofEntry = decodeImmutableProofFromVerifiableItem(verifiableStore[1]);
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

		const entryStore = streamEntryStorage.getStore();
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

		const entryStore = streamEntryStorage.getStore();
		entryStore[0].dateCreated = new Date(FIRST_TICK).toISOString();
		entryStore[1].dateCreated = new Date(SECOND_TICK).toISOString();
		entryStore[2].dateCreated = new Date(SECOND_TICK + 1000).toISOString();

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

		const streamStore = streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(2);
		expect(entryStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(2);
		expect(verifiableStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0909090909090909090909090909090909090909090909090909090909090909",
			maxAllowListSize: 100
		});
		expect(verifiableStore[1]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
			maxAllowListSize: 100
		});
		expectImmutableProof(
			decodeImmutableProofFromVerifiableItem(verifiableStore[0]),
			"2024-08-22T11:56:56.272Z"
		);
		expectImmutableProof(
			decodeImmutableProofFromVerifiableItem(verifiableStore[1]),
			"2024-08-22T11:56:56.272Z"
		);
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

		const streamStore = streamStorage.getStore();

		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const entryStore = streamEntryStorage.getStore();

		expect(entryStore).toHaveLength(3);
		expect(entryStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(2);
		expect(verifiableStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a",
			maxAllowListSize: 100
		});
		expect(verifiableStore[1]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			allowList: [TEST_ORGANIZATION_IDENTITY],
			creator: TEST_ORGANIZATION_IDENTITY,
			id: "0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c",
			maxAllowListSize: 100
		});
		expectImmutableProof(
			decodeImmutableProofFromVerifiableItem(verifiableStore[0]),
			"2024-08-22T11:56:56.272Z"
		);
		expectImmutableProof(
			decodeImmutableProofFromVerifiableItem(verifiableStore[1]),
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

		const streamStore = streamStorage.getStore();
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

		const streamStore = streamStorage.getStore();
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

		const streamStore = streamStorage.getStore();
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

		const streamStore = streamStorage.getStore();
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

		const streamStore = streamStorage.getStore();

		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const entryStore = streamEntryStorage.getStore();
		expect(entryStore).toHaveLength(12);

		const verifiableStore = verifiableStorage.getStore();
		expect(verifiableStore).toHaveLength(3);
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

		const streamStore = streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const streamStore = streamStorage.getStore();
		const streamEntityId = getStreamEntityId(streamId);
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const streamStore = streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const entryStore = streamEntryStorage.getStore();

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

		await service.removeVerifiable(streamId);

		expectStreamIdFormat(streamId);
		const streamEntityId = getStreamEntityId(streamId);

		const streamStore = streamStorage.getStore();
		expect(streamStore).toHaveLength(1);
		expect(streamStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
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

		const streamEntryStore = streamEntryStorage.getStore();
		expect(streamEntryStore).toHaveLength(2);
		expect(streamEntryStore[0]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateDeleted: undefined,
			entryObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "This is an entry note 1"
			},
			userIdentity: TEST_USER_IDENTITY,
			index: 0
		});
		expect(streamEntryStore[1]).toMatchObject({
			partitionId: TEST_TENANT_IDENTITY_SHORT,
			streamId: streamEntityId,
			dateCreated: "2024-08-22T11:56:56.272Z",
			dateDeleted: undefined,
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

		const streamStore = streamStorage.getStore();
		expect(streamStore).toEqual([]);

		const entryStore = streamEntryStorage.getStore();
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
		const entryStore = streamEntryStorage.getStore();

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
		});
		const entryStore = streamEntryStorage.getStore();

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
			conditions: [
				{
					property: "entryObject.@type",
					comparison: ComparisonOperator.Equals,
					value: "Note"
				}
			]
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
});

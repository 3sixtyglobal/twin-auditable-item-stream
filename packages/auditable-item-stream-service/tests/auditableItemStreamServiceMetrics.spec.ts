// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { TenantIdContextIdHandler } from "@twin.org/api-tenant-processor";
import {
	AuditableItemStreamContexts,
	AuditableItemStreamMetricIds,
	AuditableItemStreamModes,
	AuditableItemStreamTypes,
	type IAuditableItemStreamBase
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
import { AlreadyExistsError, ComponentFactory, RandomHelper } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { DidContextIdHandler } from "@twin.org/identity-models";
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
	MetricType,
	type ITelemetryComponent,
	type ITelemetryMetric
} from "@twin.org/telemetry-models";
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

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;
let backgroundTaskService: BackgroundTaskService | undefined;

const STREAM_CTX: IAuditableItemStreamBase["@context"] = [
	SchemaOrgContexts.Context,
	AuditableItemStreamContexts.Context,
	AuditableItemStreamContexts.ContextCommon
];

const ENTRY_OBJ = {
	"@context": "https://www.w3.org/ns/activitystreams",
	"@type": "Note",
	content: "metrics-test-entry"
} as const;

interface MetricValueEntry {
	id: string;
	value: "inc" | "dec" | number;
	customData?: { [key: string]: unknown };
}

function makeMockTelemetry(): {
	component: ITelemetryComponent;
	created: ITelemetryMetric[];
	values: MetricValueEntry[];
} {
	const created: ITelemetryMetric[] = [];
	const values: MetricValueEntry[] = [];
	const component: ITelemetryComponent = {
		className: () => "MockTelemetry",
		start: async () => {},
		stop: async () => {},
		createMetric: async m => {
			created.push({ ...m });
		},
		getMetric: async () => ({ metric: {} as never, value: {} as never }),
		updateMetric: async () => {},
		addMetricValue: async (id, value, customData) => {
			values.push({ id, value, customData });
			return "v";
		},
		getMetricValue: async (id, valueId) => ({
			id: valueId,
			metricId: id,
			value: 0,
			ts: Date.now()
		}),
		removeMetric: async () => {},
		query: async () => ({ entities: [] }),
		queryValues: async () => ({ metric: {} as never, entities: [] })
	};
	return { component, created, values };
}

describe("AuditableItemStreamService - metrics", () => {
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
	});

	beforeEach(async () => {
		const streamStorage = new MemoryEntityStorageConnector<AuditableItemStream>({
			entitySchema: nameof<AuditableItemStream>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auditable-item-stream" }
		});
		const streamEntryStorage = new MemoryEntityStorageConnector<AuditableItemStreamEntry>({
			entitySchema: nameof<AuditableItemStreamEntry>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auditable-item-stream-entry" }
		});
		EntityStorageConnectorFactory.register("auditable-item-stream", () => streamStorage);
		EntityStorageConnectorFactory.register("auditable-item-stream-entry", () => streamEntryStorage);

		const immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "immutable-proof" }
		});
		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		const notarizationStorage = new MemoryEntityStorageConnector<Notarization>({
			entitySchema: nameof<Notarization>(),
			config: { storageKey: "notarization" }
		});
		EntityStorageConnectorFactory.register("notarization", () => notarizationStorage);
		NotarizationConnectorFactory.register(
			"notarization",
			() => new EntityStorageNotarizationConnector()
		);

		const backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>(),
			config: { storageKey: "background-task" }
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const backgroundTask = new BackgroundTaskService();
		backgroundTaskService = backgroundTask;
		ComponentFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start();

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
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);

		let idCounter = 1;
		RandomHelper.generate = vi
			.fn()
			.mockImplementation(length => new Uint8Array(length).fill(idCounter++));
	});

	test("start() registers all 13 counters with type Counter", async () => {
		const { component, created } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({ telemetryComponentType: "test-telemetry" });
		await service.start();

		expect(created).toHaveLength(13);
		for (const m of created) {
			expect(m.type).toBe(MetricType.Counter);
		}

		const ids = created.map(m => m.id);
		expect(ids).toContain(AuditableItemStreamMetricIds.StreamsCreated);
		expect(ids).toContain(AuditableItemStreamMetricIds.StreamsUpdated);
		expect(ids).toContain(AuditableItemStreamMetricIds.StreamsClosed);
		expect(ids).toContain(AuditableItemStreamMetricIds.StreamsDeleted);
		expect(ids).toContain(AuditableItemStreamMetricIds.EntriesCreated);
		expect(ids).toContain(AuditableItemStreamMetricIds.EntriesUpdated);
		expect(ids).toContain(AuditableItemStreamMetricIds.EntriesDeleted);
		expect(ids).toContain(AuditableItemStreamMetricIds.ProofsCreatedStream);
		expect(ids).toContain(AuditableItemStreamMetricIds.ProofsCreatedEntry);
		expect(ids).toContain(AuditableItemStreamMetricIds.ProofsRemovedStream);
		expect(ids).toContain(AuditableItemStreamMetricIds.ProofsRemovedEntry);
		expect(ids).toContain(AuditableItemStreamMetricIds.AppendOnlyRejections);
		expect(ids).toContain(AuditableItemStreamMetricIds.ClosedStreamRejections);
	});

	test("start() is idempotent - AlreadyExistsError is swallowed", async () => {
		let callCount = 0;
		const component: ITelemetryComponent = {
			...makeMockTelemetry().component,
			createMetric: async () => {
				if (callCount++ > 0) {
					throw new AlreadyExistsError("test", "metric", "id");
				}
			}
		};
		ComponentFactory.register("test-telemetry-idempotent", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry-idempotent"
		});
		await service.start();
		await expect(service.start()).resolves.toBeUndefined();
	});

	test("create() emits ais_streams_created with mode and immutableInterval", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		const created = values.filter(v => v.id === AuditableItemStreamMetricIds.StreamsCreated);
		expect(created).toHaveLength(1);
		expect(created[0].value).toBe("inc");
		expect(created[0].customData?.immutableInterval).toBe(0);
		expect(created[0].customData?.mode).toBe("default");
	});

	test("create() with immutableInterval > 0 emits ais_proofs_created_stream", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({ telemetryComponentType: "test-telemetry" });

		await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream,
			immutableInterval: 1
		});

		const proofs = values.filter(v => v.id === AuditableItemStreamMetricIds.ProofsCreatedStream);
		expect(proofs).toHaveLength(1);
		expect(proofs[0].value).toBe("inc");
	});

	test("create() with immutableInterval = 0 does NOT emit ais_proofs_created_stream", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		expect(
			values.filter(v => v.id === AuditableItemStreamMetricIds.ProofsCreatedStream)
		).toHaveLength(0);
	});

	test("close() emits ais_streams_closed", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		await service.close(streamId);

		const closed = values.filter(v => v.id === AuditableItemStreamMetricIds.StreamsClosed);
		expect(closed).toHaveLength(1);
		expect(closed[0].value).toBe("inc");
	});

	test("update() emits ais_streams_updated", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		const { stream } = await service.get(streamId);

		await service.update({
			...stream,
			annotationObject: { "@context": "https://schema.org", "@type": "Thing", name: "updated" }
		});

		const updated = values.filter(v => v.id === AuditableItemStreamMetricIds.StreamsUpdated);
		expect(updated).toHaveLength(1);
		expect(updated[0].value).toBe("inc");
	});

	test("remove() emits ais_streams_deleted", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		await service.remove(streamId);

		const deleted = values.filter(v => v.id === AuditableItemStreamMetricIds.StreamsDeleted);
		expect(deleted).toHaveLength(1);
		expect(deleted[0].value).toBe("inc");
	});

	test("createEntry() emits ais_entries_created with hasProof: false when immutableInterval is 0", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		await service.createEntry(streamId, ENTRY_OBJ);

		const entries = values.filter(v => v.id === AuditableItemStreamMetricIds.EntriesCreated);
		expect(entries).toHaveLength(1);
		expect(entries[0].value).toBe("inc");
		expect(entries[0].customData?.hasProof).toBe(false);
	});

	test("createEntry() on closed stream emits ais_closed_stream_rejections with operation: createEntry", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		await service.close(streamId);

		await expect(service.createEntry(streamId, ENTRY_OBJ)).rejects.toThrow();

		const rejections = values.filter(
			v => v.id === AuditableItemStreamMetricIds.ClosedStreamRejections
		);
		expect(rejections).toHaveLength(1);
		expect(rejections[0].value).toBe("inc");
		expect(rejections[0].customData?.operation).toBe("createEntry");
	});

	test("updateEntry() emits ais_entries_updated", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		const entryId = await service.createEntry(streamId, ENTRY_OBJ);

		await service.updateEntry(streamId, entryId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "updated-entry"
		});

		const updated = values.filter(v => v.id === AuditableItemStreamMetricIds.EntriesUpdated);
		expect(updated).toHaveLength(1);
		expect(updated[0].value).toBe("inc");
	});

	test("updateEntry() on closed stream emits ais_closed_stream_rejections with operation: updateEntry", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		const entryId = await service.createEntry(streamId, ENTRY_OBJ);

		await service.close(streamId);

		await expect(
			service.updateEntry(streamId, entryId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "after-close-update"
			})
		).rejects.toThrow();

		const rejections = values.filter(
			v => v.id === AuditableItemStreamMetricIds.ClosedStreamRejections
		);
		expect(rejections).toHaveLength(1);
		expect(rejections[0].value).toBe("inc");
		expect(rejections[0].customData?.operation).toBe("updateEntry");
	});

	test("updateEntry() on AppendOnly stream emits ais_append_only_rejections with operation: updateEntry", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream,
			mode: AuditableItemStreamModes.AppendOnly
		});

		const entryId = await service.createEntry(streamId, ENTRY_OBJ);

		await expect(
			service.updateEntry(streamId, entryId, {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Note",
				content: "rejected-update"
			})
		).rejects.toThrow();

		const rejections = values.filter(
			v => v.id === AuditableItemStreamMetricIds.AppendOnlyRejections
		);
		expect(rejections).toHaveLength(1);
		expect(rejections[0].value).toBe("inc");
		expect(rejections[0].customData?.operation).toBe("updateEntry");
	});

	test("removeEntry() emits ais_entries_deleted", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});

		const entryId = await service.createEntry(streamId, ENTRY_OBJ);

		await service.removeEntry(streamId, entryId);

		const deleted = values.filter(v => v.id === AuditableItemStreamMetricIds.EntriesDeleted);
		expect(deleted).toHaveLength(1);
		expect(deleted[0].value).toBe("inc");
	});

	test("removeEntry() on AppendOnly stream emits ais_append_only_rejections with operation: removeEntry", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({
			telemetryComponentType: "test-telemetry",
			config: { defaultImmutableInterval: 0 }
		});

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream,
			mode: AuditableItemStreamModes.AppendOnly
		});

		const entryId = await service.createEntry(streamId, ENTRY_OBJ);

		await expect(service.removeEntry(streamId, entryId)).rejects.toThrow();

		const rejections = values.filter(
			v => v.id === AuditableItemStreamMetricIds.AppendOnlyRejections
		);
		expect(rejections).toHaveLength(1);
		expect(rejections[0].value).toBe("inc");
		expect(rejections[0].customData?.operation).toBe("removeEntry");
	});

	test("createEntry() on stream with immutableInterval 1 emits ais_proofs_created_entry and ais_entries_created with hasProof: true", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({ telemetryComponentType: "test-telemetry" });

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream,
			immutableInterval: 1
		});

		await service.createEntry(streamId, ENTRY_OBJ);

		const proofs = values.filter(v => v.id === AuditableItemStreamMetricIds.ProofsCreatedEntry);
		expect(proofs).toHaveLength(1);
		expect(proofs[0].value).toBe("inc");
		expect(proofs[0].customData?.index).toBe(0);

		const entries = values.filter(v => v.id === AuditableItemStreamMetricIds.EntriesCreated);
		expect(entries).toHaveLength(1);
		expect(entries[0].customData?.hasProof).toBe(true);
	});

	test("remove() emits ais_proofs_removed_stream when stream has a proof", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({ telemetryComponentType: "test-telemetry" });

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream,
			immutableInterval: 1
		});

		await service.remove(streamId);

		const proofsRemoved = values.filter(
			v => v.id === AuditableItemStreamMetricIds.ProofsRemovedStream
		);
		expect(proofsRemoved).toHaveLength(1);
		expect(proofsRemoved[0].value).toBe("inc");
	});

	test("remove() emits ais_proofs_removed_entry when stream has an entry with a proof", async () => {
		const { component, values } = makeMockTelemetry();
		ComponentFactory.register("test-telemetry", () => component);

		const service = new AuditableItemStreamService({ telemetryComponentType: "test-telemetry" });

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream,
			immutableInterval: 1
		});

		await service.createEntry(streamId, ENTRY_OBJ);

		await service.remove(streamId);

		const proofsRemoved = values.filter(
			v => v.id === AuditableItemStreamMetricIds.ProofsRemovedEntry
		);
		expect(proofsRemoved).toHaveLength(1);
		expect(proofsRemoved[0].value).toBe("inc");
	});

	test("service without telemetryComponentType - no errors, all operations succeed", async () => {
		const service = new AuditableItemStreamService({ config: { defaultImmutableInterval: 0 } });

		const streamId = await service.create({
			"@context": STREAM_CTX,
			type: AuditableItemStreamTypes.Stream
		});
		expect(streamId).toMatch(/^ais:[^:]+$/);

		const entryId = await service.createEntry(streamId, ENTRY_OBJ);
		expect(entryId).toBeDefined();

		await service.updateEntry(streamId, entryId, {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "updated-no-telemetry"
		});

		const { stream: streamToUpdate } = await service.get(streamId);
		await service.update({
			...streamToUpdate,
			annotationObject: { "@context": "https://schema.org", "@type": "Thing", name: "updated" }
		});

		await service.close(streamId);
		await service.remove(streamId);
	});
});

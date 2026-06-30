// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuditableItemStream,
	IAuditableItemStreamBase,
	IAuditableItemStreamEntry,
	IAuditableItemStreamEntryList,
	IAuditableItemStreamEntryObjectList,
	IAuditableItemStreamList
} from "@twin.org/auditable-item-stream-models";
import {
	AuditableItemStreamContexts,
	AuditableItemStreamTypes
} from "@twin.org/auditable-item-stream-models";
import { GuardError } from "@twin.org/core";
import { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import { HttpMethod } from "@twin.org/web";
import { AuditableItemStreamRestClient } from "../src/auditableItemStreamRestClient.js";
import {
	createdResponse,
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";
const PREFIX = "auditable-item-stream";

const STREAM_ID = "urn:ais:stream001";
const ENTRY_ID = "entry001";

const LOCATION = `${ENDPOINT}/${PREFIX}/${STREAM_ID}`;
const ENTRY_LOCATION = `${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/${ENTRY_ID}`;

const TEST_STREAM_BASE: IAuditableItemStreamBase = {
	"@context": [
		SchemaOrgContexts.Context,
		AuditableItemStreamContexts.Context,
		AuditableItemStreamContexts.ContextCommon
	],
	type: AuditableItemStreamTypes.Stream
};

const TEST_STREAM: IAuditableItemStream = {
	"@context": [
		SchemaOrgContexts.Context,
		AuditableItemStreamContexts.Context,
		AuditableItemStreamContexts.ContextCommon
	],
	type: AuditableItemStreamTypes.Stream,
	id: STREAM_ID,
	dateCreated: "2024-01-01T00:00:00Z",
	dateModified: "2024-01-01T00:00:00Z"
};

const TEST_STREAM_UPDATE: Pick<
	IAuditableItemStream,
	"@context" | "type" | "id" | "annotationObject"
> = {
	id: STREAM_ID,
	"@context": [
		SchemaOrgContexts.Context,
		AuditableItemStreamContexts.Context,
		AuditableItemStreamContexts.ContextCommon
	],
	type: AuditableItemStreamTypes.Stream,
	annotationObject: { "@type": `${SchemaOrgContexts.Context}/Thing`, name: "Updated stream" }
};

const TEST_ENTRY_OBJECT = { "@type": `${SchemaOrgContexts.Context}/Thing`, name: "Entry payload" };

const TEST_ENTRY: IAuditableItemStreamEntry = {
	type: AuditableItemStreamTypes.StreamEntry,
	id: ENTRY_ID,
	dateCreated: "2024-01-01T00:00:00Z",
	index: 0,
	entryObject: TEST_ENTRY_OBJECT
};

const TEST_STREAM_LIST: IAuditableItemStreamList = {
	"@context": [
		SchemaOrgContexts.Context,
		AuditableItemStreamContexts.Context,
		AuditableItemStreamContexts.ContextCommon
	],
	type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamList],
	[SchemaOrgTypes.ItemListElement]: [TEST_STREAM]
};

const TEST_ENTRY_LIST: IAuditableItemStreamEntryList = {
	"@context": [
		SchemaOrgContexts.Context,
		AuditableItemStreamContexts.Context,
		AuditableItemStreamContexts.ContextCommon
	],
	type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryList],
	[SchemaOrgTypes.ItemListElement]: [TEST_ENTRY]
};

const TEST_ENTRY_OBJECT_LIST: IAuditableItemStreamEntryObjectList = {
	"@context": [
		SchemaOrgContexts.Context,
		AuditableItemStreamContexts.Context,
		AuditableItemStreamContexts.ContextCommon
	],
	type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryObjectList],
	[SchemaOrgTypes.ItemListElement]: [TEST_ENTRY_OBJECT]
};

const fetchMock = vi.fn();

describe("AuditableItemStreamRestClient", () => {
	let client: AuditableItemStreamRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new AuditableItemStreamRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("create", () => {
		test("sends POST to /{prefix}", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(LOCATION));

			await client.create(TEST_STREAM_BASE);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("sends the stream as the request body", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(LOCATION));

			await client.create(TEST_STREAM_BASE);

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.type).toBe("AuditableItemStream");
		});

		test("returns the Location header value as the new stream id", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(LOCATION));

			const id = await client.create(TEST_STREAM_BASE);

			expect(id).toBe(STREAM_ID);
		});
	});

	describe("get", () => {
		test("throws when id is empty", async () => {
			await expect(client.get("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:id", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM));

			await client.get(STREAM_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the stream from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM));

			const result = await client.get(STREAM_ID);

			expect(result.stream).toEqual(TEST_STREAM);
		});

		test("returns undefined cursor when no Link header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM));

			const result = await client.get(STREAM_ID);

			expect(result.cursor).toBeUndefined();
		});

		test("extracts cursor from the Link next relation header", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"content-type": "application/json",
					link: `<${ENDPOINT}/${PREFIX}/${STREAM_ID}?cursor=page2>; rel="next"`
				}),
				json: async () => TEST_STREAM
			});

			const result = await client.get(STREAM_ID);

			expect(result.cursor).toBe("page2");
		});

		test("includes includeEntries as a query parameter when true", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM));

			await client.get(STREAM_ID, undefined, undefined, { includeEntries: true });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("includeEntries=true");
		});

		test("includes limit as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM));

			await client.get(STREAM_ID, undefined, 20);

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("limit=20");
		});

		test("includes cursor as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM));

			await client.get(STREAM_ID, "page1");

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("cursor=page1");
		});
	});

	describe("update", () => {
		test("throws when stream.id is empty", async () => {
			await expect(client.update({ ...TEST_STREAM_UPDATE, id: "" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /{prefix}/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update(TEST_STREAM_UPDATE);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}`);
			expect(options.method).toBe(HttpMethod.PUT);
		});

		test("sends the stream properties without id in the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update(TEST_STREAM_UPDATE);

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.id).toBeUndefined();
			expect(body.type).toBe("AuditableItemStream");
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.update(TEST_STREAM_UPDATE)).resolves.toBeUndefined();
		});
	});

	describe("close", () => {
		test("throws when id is empty", async () => {
			await expect(client.close("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /{prefix}/:id/close", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.close(STREAM_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/close`);
			expect(options.method).toBe(HttpMethod.PUT);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.close(STREAM_ID)).resolves.toBeUndefined();
		});
	});

	describe("removeProof", () => {
		test("throws when streamId is empty", async () => {
			await expect(client.removeProof("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /{prefix}/:id/proof", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.removeProof(STREAM_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/proof`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.removeProof(STREAM_ID)).resolves.toBeUndefined();
		});
	});

	describe("remove", () => {
		test("throws when id is empty", async () => {
			await expect(client.remove("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /{prefix}/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.remove(STREAM_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.remove(STREAM_ID)).resolves.toBeUndefined();
		});
	});

	describe("query", () => {
		test("sends GET to /{prefix}", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM_LIST));

			await client.query();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns entries from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM_LIST));

			const result = await client.query();

			expect(result.entries).toEqual(TEST_STREAM_LIST);
		});

		test("returns undefined cursor when no Link header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM_LIST));

			const result = await client.query();

			expect(result.cursor).toBeUndefined();
		});

		test("extracts cursor from the Link next relation header", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"content-type": "application/json",
					link: `<${ENDPOINT}/${PREFIX}?cursor=page2>; rel="next"`
				}),
				json: async () => TEST_STREAM_LIST
			});

			const result = await client.query();

			expect(result.cursor).toBe("page2");
		});

		test("includes cursor as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM_LIST));

			await client.query(undefined, undefined, undefined, undefined, "page1");

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("cursor=page1");
		});

		test("includes limit as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STREAM_LIST));

			await client.query(undefined, undefined, undefined, undefined, undefined, 25);

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("limit=25");
		});
	});

	describe("createEntry", () => {
		test("throws when id is empty", async () => {
			await expect(client.createEntry("", TEST_ENTRY_OBJECT)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /{prefix}/:id/entries", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(ENTRY_LOCATION));

			await client.createEntry(STREAM_ID, TEST_ENTRY_OBJECT);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("wraps the entry object under an entryObject key in the request body", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(ENTRY_LOCATION));

			await client.createEntry(STREAM_ID, TEST_ENTRY_OBJECT);

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.entryObject).toEqual(TEST_ENTRY_OBJECT);
		});

		test("returns the Location header value as the new entry id", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(ENTRY_LOCATION));

			const id = await client.createEntry(STREAM_ID, TEST_ENTRY_OBJECT);

			expect(id).toBe(ENTRY_ID);
		});
	});

	describe("getEntry", () => {
		test("throws when id is empty", async () => {
			await expect(client.getEntry("", ENTRY_ID)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when entryId is empty", async () => {
			await expect(client.getEntry(STREAM_ID, "")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:id/entries/:entryId", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY));

			await client.getEntry(STREAM_ID, ENTRY_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/${ENTRY_ID}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the entry from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY));

			const result = await client.getEntry(STREAM_ID, ENTRY_ID);

			expect(result).toEqual(TEST_ENTRY);
		});

		test("includes verifyEntry as a query parameter when true", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY));

			await client.getEntry(STREAM_ID, ENTRY_ID, { verifyEntry: true });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("verifyEntry=true");
		});
	});

	describe("getEntryObject", () => {
		test("throws when id is empty", async () => {
			await expect(client.getEntryObject("", ENTRY_ID)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when entryId is empty", async () => {
			await expect(client.getEntryObject(STREAM_ID, "")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /{prefix}/:id/entries/:entryId/object", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT));

			await client.getEntryObject(STREAM_ID, ENTRY_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/${ENTRY_ID}/object`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the entry object from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT));

			const result = await client.getEntryObject(STREAM_ID, ENTRY_ID);

			expect(result).toEqual(TEST_ENTRY_OBJECT);
		});
	});

	describe("updateEntry", () => {
		test("throws when id is empty", async () => {
			await expect(client.updateEntry("", ENTRY_ID, TEST_ENTRY_OBJECT)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when entryId is empty", async () => {
			await expect(client.updateEntry(STREAM_ID, "", TEST_ENTRY_OBJECT)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /{prefix}/:id/entries/:entryId", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updateEntry(STREAM_ID, ENTRY_ID, TEST_ENTRY_OBJECT);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/${ENTRY_ID}`);
			expect(options.method).toBe(HttpMethod.PUT);
		});

		test("wraps the entry object under an entryObject key in the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updateEntry(STREAM_ID, ENTRY_ID, TEST_ENTRY_OBJECT);

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.entryObject).toEqual(TEST_ENTRY_OBJECT);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(
				client.updateEntry(STREAM_ID, ENTRY_ID, TEST_ENTRY_OBJECT)
			).resolves.toBeUndefined();
		});
	});

	describe("removeEntry", () => {
		test("throws when id is empty", async () => {
			await expect(client.removeEntry("", ENTRY_ID)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when entryId is empty", async () => {
			await expect(client.removeEntry(STREAM_ID, "")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /{prefix}/:id/entries/:entryId", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.removeEntry(STREAM_ID, ENTRY_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/${ENTRY_ID}`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await expect(client.removeEntry(STREAM_ID, ENTRY_ID)).resolves.toBeUndefined();
		});
	});

	describe("getEntries", () => {
		test("sends GET to /{prefix}/:id/entries when id is provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_LIST));

			await client.getEntries(STREAM_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("sends GET to /{prefix}/entries when id is omitted", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_LIST));

			await client.getEntries();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/entries`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns entries from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_LIST));

			const result = await client.getEntries(STREAM_ID);

			expect(result.entries).toEqual(TEST_ENTRY_LIST);
		});

		test("returns undefined cursor when no Link header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_LIST));

			const result = await client.getEntries(STREAM_ID);

			expect(result.cursor).toBeUndefined();
		});

		test("extracts cursor from the Link next relation header", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"content-type": "application/json",
					link: `<${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries?cursor=page2>; rel="next"`
				}),
				json: async () => TEST_ENTRY_LIST
			});

			const result = await client.getEntries(STREAM_ID);

			expect(result.cursor).toBe("page2");
		});

		test("includes includeDeleted as a query parameter when true", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_LIST));

			await client.getEntries(STREAM_ID, { includeDeleted: true });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("includeDeleted=true");
		});

		test("includes limit as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_LIST));

			await client.getEntries(STREAM_ID, { limit: 10 });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("limit=10");
		});
	});

	describe("getEntryObjects", () => {
		test("sends GET to /{prefix}/:id/entries/objects when id is provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT_LIST));

			await client.getEntryObjects(STREAM_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/objects`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("sends GET to /{prefix}/entries/objects when id is omitted", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT_LIST));

			await client.getEntryObjects();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/entries/objects`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns entries from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT_LIST));

			const result = await client.getEntryObjects(STREAM_ID);

			expect(result.entries).toEqual(TEST_ENTRY_OBJECT_LIST);
		});

		test("returns undefined cursor when no Link header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT_LIST));

			const result = await client.getEntryObjects(STREAM_ID);

			expect(result.cursor).toBeUndefined();
		});

		test("extracts cursor from the Link next relation header", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"content-type": "application/json",
					link: `<${ENDPOINT}/${PREFIX}/${STREAM_ID}/entries/objects?cursor=page2>; rel="next"`
				}),
				json: async () => TEST_ENTRY_OBJECT_LIST
			});

			const result = await client.getEntryObjects(STREAM_ID);

			expect(result.cursor).toBe("page2");
		});

		test("includes includeDeleted as a query parameter when true", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT_LIST));

			await client.getEntryObjects(STREAM_ID, { includeDeleted: true });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("includeDeleted=true");
		});

		test("includes limit as a query parameter when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_ENTRY_OBJECT_LIST));

			await client.getEntryObjects(STREAM_ID, { limit: 5 });

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain("limit=5");
		});
	});
});

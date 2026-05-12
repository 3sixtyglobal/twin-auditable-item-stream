// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemStreamContexts,
	AuditableItemStreamTypes
} from "@twin.org/auditable-item-stream-models";
import { SchemaOrgContexts } from "@twin.org/standards-schema-org";
import { HeaderTypes } from "@twin.org/web";
import { AuditableItemStreamRestClient } from "../src/auditableItemStreamRestClient.js";

describe("AuditableItemStreamRestClient", () => {
	test("Can create an instance", async () => {
		const client = new AuditableItemStreamRestClient({ endpoint: "http://localhost:8080" });
		expect(client).toBeDefined();
	});

	test("Uses route paths that match auditable item stream routes", async () => {
		const client = new AuditableItemStreamRestClient({ endpoint: "http://localhost:8080" });

		const fetchSpy = vi.spyOn(client, "fetch").mockResolvedValue({
			headers: {
				[HeaderTypes.Location]: "ais:stream-id:entry-id"
			},
			body: {
				"@context": [],
				type: "ItemList",
				itemListElement: []
			}
		});

		await client.create({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream
		});
		await client.get("ais:stream-id");
		await client.update({
			"@context": [
				SchemaOrgContexts.Context,
				AuditableItemStreamContexts.Context,
				AuditableItemStreamContexts.ContextCommon
			],
			type: AuditableItemStreamTypes.Stream,
			id: "ais:stream-id"
		});
		await client.close("ais:stream-id");
		await client.remove("ais:stream-id");
		await client.query();
		await client.createEntry("ais:stream-id", {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "entry"
		});
		await client.getEntry("ais:stream-id", "ais:stream-id:entry-id");
		await client.getEntryObject("ais:stream-id", "ais:stream-id:entry-id");
		await client.updateEntry("ais:stream-id", "ais:stream-id:entry-id", {
			"@context": "https://www.w3.org/ns/activitystreams",
			"@type": "Note",
			content: "updated"
		});
		await client.removeEntry("ais:stream-id", "ais:stream-id:entry-id");
		await client.getEntries("ais:stream-id");
		await client.getEntries();
		await client.getEntryObjects("ais:stream-id");
		await client.getEntryObjects();

		expect(fetchSpy).toHaveBeenNthCalledWith(1, "/", "POST", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(2, "/:id", "GET", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(3, "/:id", "PUT", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(4, "/:id/close", "PUT", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(5, "/:id", "DELETE", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(6, "/", "GET", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(7, "/:id/entries", "POST", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(8, "/:id/entries/:entryId", "GET", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(
			9,
			"/:id/entries/:entryId/object",
			"GET",
			expect.any(Object)
		);
		expect(fetchSpy).toHaveBeenNthCalledWith(
			10,
			"/:id/entries/:entryId",
			"PUT",
			expect.any(Object)
		);
		expect(fetchSpy).toHaveBeenNthCalledWith(
			11,
			"/:id/entries/:entryId",
			"DELETE",
			expect.any(Object)
		);
		expect(fetchSpy).toHaveBeenNthCalledWith(12, "/:id/entries", "GET", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(13, "/entries", "GET", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(14, "/:id/entries/objects", "GET", expect.any(Object));
		expect(fetchSpy).toHaveBeenNthCalledWith(15, "/entries/objects", "GET", expect.any(Object));
	});
});

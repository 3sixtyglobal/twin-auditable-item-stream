// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys, type IHttpRequestContext } from "@3sixty/api-models";
import type { IAuditableItemStreamComponent } from "@3sixty/auditable-item-stream-models";
import { ContextIdStore } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";
import { auditableItemStreamCreateEntry } from "../src/auditableItemStreamRoutes.js";

describe("auditableItemStreamRoutes", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("auditableItemStreamCreateEntry() substitutes streamId in the Location header", async () => {
		const mockCreateEntry = vi.fn().mockResolvedValue("ais:stream-1234:entry-5678");
		const mockComponent = {
			createEntry: mockCreateEntry
		} as unknown as IAuditableItemStreamComponent;

		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockComponent);
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[HttpContextIdKeys.PublicOrigin]: "https://api.example.org"
		});

		const requestContext = {
			serverRequest: { url: "/auditable-item-stream/ais:stream-1234/entries" }
		} as IHttpRequestContext;

		const result = await auditableItemStreamCreateEntry(
			requestContext,
			"auditable-item-stream",
			{
				pathParams: { id: "ais:stream-1234" },
				body: {
					entryObject: {
						"@context": "https://schema.org",
						"@type": "Thing",
						name: "Example"
					}
				}
			},
			"/auditable-item-stream"
		);

		expect(mockCreateEntry).toHaveBeenCalledWith("ais:stream-1234", {
			"@context": "https://schema.org",
			"@type": "Thing",
			name: "Example"
		});
		expect(result.statusCode).toBe(HttpStatusCode.created);

		const locationHeader = result.headers[HeaderTypes.Location];
		expect(locationHeader).toBe(
			"https://api.example.org/auditable-item-stream/ais%3Astream-1234/entries/ais%3Astream-1234%3Aentry-5678"
		);
		expect(locationHeader).not.toContain(":streamId");
	});
});

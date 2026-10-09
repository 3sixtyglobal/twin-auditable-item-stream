// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@3sixty/core";
import { DataTypeHelper } from "@3sixty/data-core";
import { JsonLdDataTypes } from "@3sixty/data-json-ld";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";
import { AuditableItemStreamDataTypes } from "../../src/dataTypes/auditableItemStreamDataTypes.js";
import { AuditableItemStreamContexts } from "../../src/models/auditableItemStreamContexts.js";
import { AuditableItemStreamTypes } from "../../src/models/auditableItemStreamTypes.js";

describe("AuditableItemStreamDataTypes", () => {
	beforeAll(async () => {
		JsonLdDataTypes.registerTypes();
		AuditableItemStreamDataTypes.registerTypes();
	});

	test("Can fail to validate an empty stream", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			`${AuditableItemStreamContexts.Namespace}${AuditableItemStreamTypes.Stream}`,
			{
				id: "foo",
				dateCreated: new Date().toISOString(),
				immutableInterval: 10,
				organizationIdentity: "org"
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(2);
		expect(isValid).toEqual(false);
	});

	test("Can validate an empty stream", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			`${AuditableItemStreamContexts.Namespace}${AuditableItemStreamTypes.Stream}`,
			{
				"@context": [
					SchemaOrgContexts.Context,
					AuditableItemStreamContexts.Namespace,
					AuditableItemStreamContexts.NamespaceCommon
				],
				type: AuditableItemStreamTypes.Stream,
				id: "foo",
				dateCreated: new Date().toISOString(),
				immutableInterval: 10,
				organizationIdentity: "org",
				proofId: "1111",
				numberOfItems: 0
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});
});

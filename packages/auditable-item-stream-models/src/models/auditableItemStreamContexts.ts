// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The contexts of auditable item stream data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemStreamContexts = {
	/**
	 * The canonical RDF namespace URI for Auditable Item Stream.
	 */
	Namespace: "https://schema.3sixty.global/ais/",

	/**
	 * The value to use in context for Auditable Item Stream.
	 */
	Context: "https://schema.3sixty.global/ais/",

	/**
	 * The JSON-LD Context URL for Auditable Item Stream.
	 */
	JsonLdContext: "https://schema.3sixty.global/ais/types.jsonld",

	/**
	 * The canonical RDF namespace URI for TWIN Common.
	 */
	NamespaceCommon: "https://schema.3sixty.global/common/",

	/**
	 * The value to use in JSON-LD context for TWIN Common.
	 */
	ContextCommon: "https://schema.3sixty.global/common/",

	/**
	 * The JSON-LD Context URL for TWIN Common.
	 */
	JsonLdContextCommon: "https://schema.3sixty.global/common/types.jsonld"
} as const;

/**
 * The types of auditable item stream data.
 */
export type AuditableItemStreamContexts =
	(typeof AuditableItemStreamContexts)[keyof typeof AuditableItemStreamContexts];

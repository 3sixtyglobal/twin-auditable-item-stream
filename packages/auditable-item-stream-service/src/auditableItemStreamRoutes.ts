// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpParameterHelper,
	type ICreatedResponse,
	type IHostingComponent,
	type IHttpRequestContext,
	type INoContentResponse,
	type INotFoundResponse,
	type IRestRoute,
	type ITag
} from "@twin.org/api-models";
import {
	AuditableItemStreamContexts,
	AuditableItemStreamTypes,
	type IAuditableItemStreamListEntriesNoStreamRequest,
	type IAuditableItemStreamListEntryObjectsNoStreamRequest,
	type IAuditableItemStreamComponent,
	type IAuditableItemStreamCloseRequest,
	type IAuditableItemStreamCreateEntryRequest,
	type IAuditableItemStreamCreateRequest,
	type IAuditableItemStreamDeleteEntryRequest,
	type IAuditableItemStreamDeleteRequest,
	type IAuditableItemStreamGetEntryObjectRequest,
	type IAuditableItemStreamGetEntryObjectResponse,
	type IAuditableItemStreamGetEntryRequest,
	type IAuditableItemStreamGetEntryResponse,
	type IAuditableItemStreamGetRequest,
	type IAuditableItemStreamGetResponse,
	type IAuditableItemStreamListEntriesRequest,
	type IAuditableItemStreamListEntriesResponse,
	type IAuditableItemStreamListEntryObjectsRequest,
	type IAuditableItemStreamListEntryObjectsResponse,
	type IAuditableItemStreamListRequest,
	type IAuditableItemStreamListResponse,
	type IAuditableItemStreamRemoveProofRequest,
	type IAuditableItemStreamUpdateEntryRequest,
	type IAuditableItemStreamUpdateRequest
} from "@twin.org/auditable-item-stream-models";
import { Coerce, ComponentFactory, Guards, Is } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import { HeaderHelper, HeaderTypes, HttpStatusCode, MimeTypes } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "auditableItemStreamRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsAuditableItemStream: ITag[] = [
	{
		name: "Auditable Item Stream",
		description: "Endpoints which are modelled to access an auditable item stream contract."
	}
];

/**
 * The REST routes for auditable item stream.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuditableItemStream(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IAuditableItemStreamCreateRequest, ICreatedResponse> = {
		operationId: "auditableItemStreamCreate",
		summary: "Create a new stream",
		tag: tagsAuditableItemStream[0].name,
		method: "POST",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamCreate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamCreateRequest>(),
			examples: [
				{
					id: "auditableItemStreamCreateRequestExample",
					request: {
						body: {
							"@context": [
								SchemaOrgContexts.Context,
								AuditableItemStreamContexts.Context,
								AuditableItemStreamContexts.ContextCommon
							],
							type: AuditableItemStreamTypes.Stream,
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							},
							entries: {
								type: SchemaOrgTypes.ItemList,
								[SchemaOrgTypes.ItemListElement]: [
									{
										type: AuditableItemStreamTypes.StreamEntry,
										entryObject: {
											"@context": "https://schema.org",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "auditableItemStreamCreateResponseExample",
						description: "The response when a new stream is created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								[HeaderTypes.Location]: "ais%3A1234567890"
							}
						}
					}
				]
			}
		]
	};

	const getRoute: IRestRoute<IAuditableItemStreamGetRequest, IAuditableItemStreamGetResponse> = {
		operationId: "auditableItemStreamGet",
		summary: "Get a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamGetRequest>(),
			examples: [
				{
					id: "auditableItemStreamGetRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamGetResponse>(),
				examples: [
					{
						id: "auditableItemStreamGetResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: AuditableItemStreamTypes.Stream,
								id: "ais:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								dateModified: "2024-08-22T11:55:16.271Z",
								annotationObject: {
									"@context": "https://schema.org",
									"@type": "Note",
									content: "This is a simple note"
								},
								organizationIdentity: "did:iota:1234567890",
								proofId: "0101010101010101010101010101010101010101010101010101010101010101",
								immutableInterval: 10,
								numberOfItems: 1,
								entries: {
									type: SchemaOrgTypes.ItemList,
									[SchemaOrgTypes.ItemListElement]: [
										{
											"@context": [
												AuditableItemStreamContexts.Context,
												AuditableItemStreamContexts.ContextCommon
											],
											type: AuditableItemStreamTypes.StreamEntry,
											id: "tst:1234567890",
											dateCreated: "2024-08-22T11:55:16.271Z",
											proofId: "0101010101010101010101010101010101010101010101010101010101010101",
											index: 0,
											entryObject: {
												"@context": "https://schema.org",
												"@type": "Event",
												startDate: "2011-04-09T20:00:00Z",
												description: "A description of the event"
											}
										}
									]
								}
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdGetResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: AuditableItemStreamTypes.Stream,
								id: "ais:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								dateModified: "2024-08-22T11:55:16.271Z",
								annotationObject: {
									"@context": "https://schema.org",
									"@type": "Note",
									content: "This is a simple note"
								},
								organizationIdentity: "did:iota:1234567890",
								proofId: "0101010101010101010101010101010101010101010101010101010101010101",
								immutableInterval: 10,
								numberOfItems: 1,
								entries: {
									type: SchemaOrgTypes.ItemList,
									[SchemaOrgTypes.ItemListElement]: [
										{
											"@context": [
												AuditableItemStreamContexts.Context,
												AuditableItemStreamContexts.ContextCommon
											],
											type: AuditableItemStreamTypes.StreamEntry,
											id: "tst:1234567890",
											dateCreated: "2024-08-22T11:55:16.271Z",
											proofId: "0101010101010101010101010101010101010101010101010101010101010101",
											index: 0,
											entryObject: {
												"@context": "https://schema.org",
												"@type": "Event",
												startDate: "2011-04-09T20:00:00Z",
												description: "A description of the event"
											}
										}
									]
								}
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const updateRoute: IRestRoute<IAuditableItemStreamUpdateRequest, INoContentResponse> = {
		operationId: "auditableItemStreamUpdate",
		summary: "Update a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamUpdateRequest>(),
			examples: [
				{
					id: "auditableItemStreamUpdateRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						},
						body: {
							"@context": [
								SchemaOrgContexts.Context,
								AuditableItemStreamContexts.Context,
								AuditableItemStreamContexts.ContextCommon
							],
							type: AuditableItemStreamTypes.Stream,
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const deleteRoute: IRestRoute<IAuditableItemStreamDeleteRequest, INoContentResponse> = {
		operationId: "auditableItemStreamDelete",
		summary: "Delete a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamDelete(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamDeleteRequest>(),
			examples: [
				{
					id: "auditableItemStreamDeleteRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const closeRoute: IRestRoute<IAuditableItemStreamCloseRequest, INoContentResponse> = {
		operationId: "auditableItemStreamClose",
		summary: "Close a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id/close`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamClose(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamCloseRequest>(),
			examples: [
				{
					id: "auditableItemStreamCloseRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listRoute: IRestRoute<IAuditableItemStreamListRequest, IAuditableItemStreamListResponse> = {
		operationId: "auditableItemStreamList",
		summary: "Query streams",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListRequest>(),
			examples: [
				{
					id: "IAuditableItemStreamListAllRequest",
					request: {}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListResponse>(),
				examples: [
					{
						id: "auditableItemStreamListResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											SchemaOrgContexts.Context,
											AuditableItemStreamContexts.Context,
											AuditableItemStreamContexts.ContextCommon
										],
										type: AuditableItemStreamTypes.Stream,
										id: "ais:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										dateModified: "2024-08-22T11:55:16.271Z",
										annotationObject: {
											"@context": "https://schema.org",
											"@type": "Note",
											content: "This is a simple note"
										},
										organizationIdentity: "did:iota:1234567890",
										proofId: "0101010101010101010101010101010101010101010101010101010101010101",
										immutableInterval: 10,
										numberOfItems: 0
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamListResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdListResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											SchemaOrgContexts.Context,
											AuditableItemStreamContexts.Context,
											AuditableItemStreamContexts.ContextCommon
										],
										type: AuditableItemStreamTypes.Stream,
										id: "ais:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										dateModified: "2024-08-22T11:55:16.271Z",
										annotationObject: {
											"@context": "https://schema.org",
											"@type": "Note",
											content: "This is a simple note"
										},
										organizationIdentity: "did:iota:1234567890",
										proofId: "0101010101010101010101010101010101010101010101010101010101010101",
										immutableInterval: 10,
										numberOfItems: 0
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const createEntryRoute: IRestRoute<IAuditableItemStreamCreateEntryRequest, ICreatedResponse> = {
		operationId: "auditableItemStreamCreateEntry",
		summary: "Create a new stream entry",
		tag: tagsAuditableItemStream[0].name,
		method: "POST",
		path: `${baseRouteName}/:id/entries`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamCreateEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamCreateEntryRequest>(),
			examples: [
				{
					id: "auditableItemStreamCreateEntryRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						},
						body: {
							entryObject: {
								"@context": "https://schema.org",
								"@type": "Event",
								startDate: "2011-04-09T20:00:00Z",
								description: "A description of the event"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "auditableItemStreamCreateEntryResponseExample",
						description: "The response when a new stream entry is created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								[HeaderTypes.Location]: "ais%3A1234567890%3A01010101010"
							}
						}
					}
				]
			}
		]
	};

	const deleteEntryRoute: IRestRoute<IAuditableItemStreamDeleteEntryRequest, INoContentResponse> = {
		operationId: "auditableItemStreamDeleteEntry",
		summary: "Delete an entry from the stream",
		tag: tagsAuditableItemStream[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id/entries/:entryId`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamDeleteEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamDeleteRequest>(),
			examples: [
				{
					id: "auditableItemStreamDeleteEntryRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const updateEntryRoute: IRestRoute<IAuditableItemStreamUpdateEntryRequest, INoContentResponse> = {
		operationId: "auditableItemStreamUpdateEntry",
		summary: "Update a stream entry",
		tag: tagsAuditableItemStream[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id/entries/:entryId`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamUpdateEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamUpdateEntryRequest>(),
			examples: [
				{
					id: "auditableItemStreamUpdateRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						},
						body: {
							entryObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const getEntryRoute: IRestRoute<
		IAuditableItemStreamGetEntryRequest,
		IAuditableItemStreamGetEntryResponse
	> = {
		operationId: "auditableItemStreamGetEntry",
		summary: "Get a stream entry",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/entries/:entryId`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamGetEntry(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamGetEntryRequest>(),
			examples: [
				{
					id: "auditableItemStreamGetEntryRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamGetEntryResponse>(),
				examples: [
					{
						id: "auditableItemStreamGetEntryResponseExample",
						response: {
							body: {
								"@context": [
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: AuditableItemStreamTypes.StreamEntry,
								id: "tst:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								proofId: "0101010101010101010101010101010101010101010101010101010101010101",
								index: 0,
								entryObject: {
									"@context": "https://schema.org",
									"@type": "Event",
									startDate: "2011-04-09T20:00:00Z",
									description: "A description of the event"
								}
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamGetEntryResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdGetEntryResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: AuditableItemStreamTypes.StreamEntry,
								id: "tst:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								proofId: "0101010101010101010101010101010101010101010101010101010101010101",
								index: 0,
								entryObject: {
									"@context": "https://schema.org",
									"@type": "Event",
									startDate: "2011-04-09T20:00:00Z",
									description: "A description of the event"
								}
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const getEntryObjectRoute: IRestRoute<
		IAuditableItemStreamGetEntryObjectRequest,
		IAuditableItemStreamGetEntryObjectResponse
	> = {
		operationId: "auditableItemStreamGetEntryObject",
		summary: "Get a stream entry object",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/entries/:entryId/object`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamGetEntryObject(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamGetEntryRequest>(),
			examples: [
				{
					id: "auditableItemStreamGetEntryObjectRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890",
							entryId: "ais:1234567890:01010101010"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamGetEntryObjectResponse>(),
				examples: [
					{
						id: "auditableItemStreamGetEntryObjectResponseExample",
						response: {
							body: {
								"@context": "https://schema.org",
								"@type": "Event",
								startDate: "2011-04-09T20:00:00Z",
								description: "A description of the event"
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listEntriesRoute: IRestRoute<
		IAuditableItemStreamListEntriesRequest,
		IAuditableItemStreamListEntriesResponse
	> = {
		operationId: "auditableItemStreamListEntries",
		summary: "Get the entry objects in a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/entries`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamListEntries(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListEntriesRequest>(),
			examples: [
				{
					id: "auditableItemStreamListEntriesRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListEntriesResponse>(),
				examples: [
					{
						id: "auditableItemStreamListEntriesResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemStreamContexts.Context,
											AuditableItemStreamContexts.ContextCommon
										],
										type: AuditableItemStreamTypes.StreamEntry,
										id: "tst:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										proofId: "0101010101010101010101010101010101010101010101010101010101010101",
										index: 0,
										entryObject: {
											"@context": "https://schema.org",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamListEntriesResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdListEntriesResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemStreamContexts.Context,
											AuditableItemStreamContexts.ContextCommon
										],
										type: AuditableItemStreamTypes.StreamEntry,
										id: "tst:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										proofId: "0101010101010101010101010101010101010101010101010101010101010101",
										index: 0,
										entryObject: {
											"@context": "https://schema.org",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listEntriesNoStreamRoute: IRestRoute<
		IAuditableItemStreamListEntriesNoStreamRequest,
		IAuditableItemStreamListEntriesResponse
	> = {
		operationId: "auditableItemStreamListEntriesNoStream",
		summary: "Get the entry objects for all streams",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/entries`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamListEntriesNoStream(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListEntriesNoStreamRequest>(),
			examples: [
				{
					id: "auditableItemStreamListEntriesNoStreamRequestExample",
					request: {}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListEntriesResponse>(),
				examples: [
					{
						id: "auditableItemStreamListEntriesNoStreamResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemStreamContexts.Context,
											AuditableItemStreamContexts.ContextCommon
										],
										type: AuditableItemStreamTypes.StreamEntry,
										id: "tst:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										proofId: "0101010101010101010101010101010101010101010101010101010101010101",
										index: 0,
										entryObject: {
											"@context": "https://schema.org",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemStreamListEntriesResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemStreamJsonLdListEntriesNoStreamResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemStreamContexts.Context,
											AuditableItemStreamContexts.ContextCommon
										],
										type: AuditableItemStreamTypes.StreamEntry,
										id: "tst:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z",
										proofId: "0101010101010101010101010101010101010101010101010101010101010101",
										index: 0,
										entryObject: {
											"@context": "https://schema.org",
											"@type": "Event",
											startDate: "2011-04-09T20:00:00Z",
											description: "A description of the event"
										}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listEntryObjectsRoute: IRestRoute<
		IAuditableItemStreamListEntryObjectsRequest,
		IAuditableItemStreamListEntryObjectsResponse
	> = {
		operationId: "auditableItemStreamListEntryObjects",
		summary: "Get the entry objects in a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/entries/objects`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamListEntryObjects(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListEntryObjectsRequest>(),
			examples: [
				{
					id: "auditableItemStreamListEntryObjectsRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListEntryObjectsResponse>(),
				examples: [
					{
						id: "auditableItemStreamListEntryObjectsResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryObjectList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": "https://schema.org",
										"@type": "Event",
										startDate: "2011-04-09T20:00:00Z",
										description: "A description of the event"
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const listEntryObjectsNoStreamRoute: IRestRoute<
		IAuditableItemStreamListEntryObjectsNoStreamRequest,
		IAuditableItemStreamListEntryObjectsResponse
	> = {
		operationId: "auditableItemStreamListEntryObjectsNoStream",
		summary: "Get the entry objects for all streams",
		tag: tagsAuditableItemStream[0].name,
		method: "GET",
		path: `${baseRouteName}/entries/objects`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamListEntryObjectsNoStream(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamListEntryObjectsNoStreamRequest>(),
			examples: [
				{
					id: "auditableItemStreamListEntryObjectsNoStreamRequestExample",
					request: {}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemStreamListEntryObjectsResponse>(),
				examples: [
					{
						id: "auditableItemStreamListEntryObjectsNoStreamResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.Context,
									AuditableItemStreamContexts.Context,
									AuditableItemStreamContexts.ContextCommon
								],
								type: [SchemaOrgTypes.ItemList, AuditableItemStreamTypes.StreamEntryObjectList],
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": "https://schema.org",
										"@type": "Event",
										startDate: "2011-04-09T20:00:00Z",
										description: "A description of the event"
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	const removeProofRoute: IRestRoute<IAuditableItemStreamRemoveProofRequest, INoContentResponse> = {
		operationId: "auditableItemStreamRemoveProof",
		summary: "Remove the proof from a stream",
		tag: tagsAuditableItemStream[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id/proof`,
		handler: async (httpRequestContext, request) =>
			auditableItemStreamRemoveProof(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemStreamRemoveProofRequest>(),
			examples: [
				{
					id: "auditableItemStreamRemoveProofRequestExample",
					request: {
						pathParams: {
							id: "ais:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		]
	};

	return [
		createRoute,
		getRoute,
		updateRoute,
		deleteRoute,
		closeRoute,
		listRoute,
		createEntryRoute,
		getEntryRoute,
		getEntryObjectRoute,
		deleteEntryRoute,
		updateEntryRoute,
		listEntriesRoute,
		listEntriesNoStreamRoute,
		listEntryObjectsRoute,
		listEntryObjectsNoStreamRoute,
		removeProofRoute
	];
}

/**
 * Create the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamCreateRequest
): Promise<ICreatedResponse> {
	Guards.object<IAuditableItemStreamCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const id = await component.create(request.body);
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			[HeaderTypes.Location]: id
		}
	};
}

/**
 * Get the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamGetRequest
): Promise<IAuditableItemStreamGetResponse> {
	Guards.object<IAuditableItemStreamGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const hostingComponent = ComponentFactory.get<IHostingComponent>(
		httpRequestContext.hostingComponentType ?? "hosting"
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const result = await component.get(
		request.pathParams.id,
		request.query?.cursor,
		Coerce.integer(request.query?.limit),
		{
			includeEntries: Coerce.boolean(request.query?.includeEntries),
			includeDeleted: Coerce.boolean(request.query?.includeDeleted),
			verifyStream: Coerce.boolean(request.query?.verifyStream),
			verifyEntries: Coerce.boolean(request.query?.verifyEntries)
		}
	);

	const headers: IAuditableItemStreamListResponse["headers"] = {
		[HeaderTypes.ContentType]:
			request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? MimeTypes.JsonLd : MimeTypes.Json
	};

	if (Is.stringValue(result.cursor)) {
		headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(
			await hostingComponent.buildPublicUrl(httpRequestContext.serverRequest.url),
			{ cursor: result.cursor },
			"next"
		);
	}

	return {
		headers,
		body: result.stream
	};
}

/**
 * Update the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object<IAuditableItemStreamUpdateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.update({
		...request.body,
		id: request.pathParams.id
	});
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Delete the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamDelete(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamDeleteRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamDeleteRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamDeleteRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.remove(request.pathParams.id);
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Close the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamClose(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamCloseRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamCloseRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamCloseRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.close(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListRequest
): Promise<IAuditableItemStreamListResponse> {
	Guards.object<IAuditableItemStreamListRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamListRequest["query"]>(
		ROUTES_SOURCE,
		nameof(request.query),
		request.query
	);

	const hostingComponent = ComponentFactory.get<IHostingComponent>(
		httpRequestContext.hostingComponentType ?? "hosting"
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const result = await component.query(
		HttpParameterHelper.objectFromString(request.query?.conditions),
		request.query?.orderBy,
		request.query?.orderByDirection,
		HttpParameterHelper.arrayFromString(request.query?.properties),
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);

	const headers: IAuditableItemStreamListResponse["headers"] = {
		[HeaderTypes.ContentType]:
			request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? MimeTypes.JsonLd : MimeTypes.Json
	};

	if (Is.stringValue(result.cursor)) {
		headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(
			await hostingComponent.buildPublicUrl(httpRequestContext.serverRequest.url),
			{ cursor: result.cursor },
			"next"
		);
	}

	return {
		headers,
		body: result.entries
	};
}

/**
 * Create the stream entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamCreateEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamCreateEntryRequest
): Promise<ICreatedResponse> {
	Guards.object<IAuditableItemStreamCreateEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamCreateEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAuditableItemStreamCreateEntryRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.objectValue(ROUTES_SOURCE, nameof(request.body.entryObject), request.body.entryObject);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const id = await component.createEntry(request.pathParams.id, request.body.entryObject);
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			[HeaderTypes.Location]: id
		}
	};
}

/**
 * Get the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamDeleteEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamDeleteEntryRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamDeleteEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamDeleteEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.removeEntry(request.pathParams.id, request.pathParams.entryId);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Update the stream entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamUpdateEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamUpdateEntryRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamUpdateEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamUpdateEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.objectValue<IAuditableItemStreamUpdateEntryRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);
	Guards.objectValue(ROUTES_SOURCE, nameof(request.body.entryObject), request.body.entryObject);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.updateEntry(
		request.pathParams.id,
		request.pathParams.entryId,
		request.body.entryObject
	);
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get a stream entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamGetEntry(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamGetEntryRequest
): Promise<IAuditableItemStreamGetEntryResponse> {
	Guards.object<IAuditableItemStreamGetEntryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamGetEntryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const result = await component.getEntry(request.pathParams.id, request.pathParams.entryId, {
		verifyEntry: Coerce.boolean(request.query?.verifyEntry)
	});

	return {
		headers: {
			[HeaderTypes.ContentType]:
				request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd
					? MimeTypes.JsonLd
					: MimeTypes.Json
		},
		body: result
	};
}

/**
 * Get a stream entry object.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamGetEntryObject(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamGetEntryObjectRequest
): Promise<IAuditableItemStreamGetEntryObjectResponse> {
	Guards.object<IAuditableItemStreamGetEntryObjectRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamGetEntryObjectRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.entryId), request.pathParams.entryId);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	const result = await component.getEntryObject(request.pathParams.id, request.pathParams.entryId);

	return {
		headers: {
			[HeaderTypes.ContentType]:
				request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd
					? MimeTypes.JsonLd
					: MimeTypes.Json
		},
		body: result
	};
}

/**
 * Query the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamListEntries(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListEntriesRequest
): Promise<IAuditableItemStreamListEntriesResponse> {
	Guards.object<IAuditableItemStreamListEntriesRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamListEntriesRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const hostingComponent = ComponentFactory.get<IHostingComponent>(
		httpRequestContext.hostingComponentType ?? "hosting"
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const result = await component.getEntries(request.pathParams.id, {
		conditions: HttpParameterHelper.objectFromString(request.query?.conditions),
		includeDeleted: Coerce.boolean(request.query?.includeDeleted),
		verifyEntries: Coerce.boolean(request.query?.verifyEntries),
		order: request.query?.order,
		limit: Coerce.integer(request.query?.limit),
		cursor: request.query?.cursor
	});

	const headers: IAuditableItemStreamListEntriesResponse["headers"] = {
		[HeaderTypes.ContentType]:
			request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? MimeTypes.JsonLd : MimeTypes.Json
	};

	if (Is.stringValue(result.cursor)) {
		headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(
			await hostingComponent.buildPublicUrl(httpRequestContext.serverRequest.url),
			{ cursor: result.cursor },
			"next"
		);
	}

	return {
		headers,
		body: result.entries
	};
}

/**
 * Query the stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamListEntriesNoStream(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListEntriesNoStreamRequest
): Promise<IAuditableItemStreamListEntriesResponse> {
	Guards.object<IAuditableItemStreamListEntriesNoStreamRequest>(
		ROUTES_SOURCE,
		nameof(request),
		request
	);

	const hostingComponent = ComponentFactory.get<IHostingComponent>(
		httpRequestContext.hostingComponentType ?? "hosting"
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const result = await component.getEntries(undefined, {
		conditions: HttpParameterHelper.objectFromString(request.query?.conditions),
		includeDeleted: Coerce.boolean(request.query?.includeDeleted),
		verifyEntries: Coerce.boolean(request.query?.verifyEntries),
		order: request.query?.order,
		limit: Coerce.integer(request.query?.limit),
		cursor: request.query?.cursor
	});

	const headers: IAuditableItemStreamListEntriesResponse["headers"] = {
		[HeaderTypes.ContentType]:
			request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? MimeTypes.JsonLd : MimeTypes.Json
	};

	if (Is.stringValue(result.cursor)) {
		headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(
			await hostingComponent.buildPublicUrl(httpRequestContext.serverRequest.url),
			{ cursor: result.cursor },
			"next"
		);
	}

	return {
		headers,
		body: result.entries
	};
}

/**
 * Query the stream objects.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamListEntryObjects(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListEntryObjectsRequest
): Promise<IAuditableItemStreamListEntryObjectsResponse> {
	Guards.object<IAuditableItemStreamListEntryObjectsRequest>(
		ROUTES_SOURCE,
		nameof(request),
		request
	);
	Guards.object<IAuditableItemStreamListEntryObjectsRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const hostingComponent = ComponentFactory.get<IHostingComponent>(
		httpRequestContext.hostingComponentType ?? "hosting"
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const result = await component.getEntryObjects(request.pathParams.id, {
		conditions: HttpParameterHelper.objectFromString(request.query?.conditions),
		includeDeleted: Coerce.boolean(request.query?.includeDeleted),
		order: request.query?.order,
		limit: Coerce.integer(request.query?.limit),
		cursor: request.query?.cursor
	});

	const headers: IAuditableItemStreamListEntryObjectsResponse["headers"] = {
		[HeaderTypes.ContentType]:
			request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? MimeTypes.JsonLd : MimeTypes.Json
	};

	if (Is.stringValue(result.cursor)) {
		headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(
			await hostingComponent.buildPublicUrl(httpRequestContext.serverRequest.url),
			{ cursor: result.cursor },
			"next"
		);
	}

	return {
		headers,
		body: result.entries
	};
}

/**
 * Query the stream objects.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamListEntryObjectsNoStream(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamListEntryObjectsNoStreamRequest
): Promise<IAuditableItemStreamListEntryObjectsResponse> {
	Guards.object<IAuditableItemStreamListEntryObjectsNoStreamRequest>(
		ROUTES_SOURCE,
		nameof(request),
		request
	);

	const hostingComponent = ComponentFactory.get<IHostingComponent>(
		httpRequestContext.hostingComponentType ?? "hosting"
	);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);

	const result = await component.getEntryObjects(undefined, {
		conditions: HttpParameterHelper.objectFromString(request.query?.conditions),
		includeDeleted: Coerce.boolean(request.query?.includeDeleted),
		order: request.query?.order,
		limit: Coerce.integer(request.query?.limit),
		cursor: request.query?.cursor
	});

	const headers: IAuditableItemStreamListEntryObjectsResponse["headers"] = {
		[HeaderTypes.ContentType]:
			request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? MimeTypes.JsonLd : MimeTypes.Json
	};

	if (Is.stringValue(result.cursor)) {
		headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(
			await hostingComponent.buildPublicUrl(httpRequestContext.serverRequest.url),
			{ cursor: result.cursor },
			"next"
		);
	}

	return {
		headers,
		body: result.entries
	};
}

/**
 * Remove the proof from a stream.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemStreamRemoveProof(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemStreamRemoveProofRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemStreamRemoveProofRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemStreamRemoveProofRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IAuditableItemStreamComponent>(componentName);
	await component.removeProof(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

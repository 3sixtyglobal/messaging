// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type ITag
} from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { Coerce, ComponentFactory, Guards } from "@3sixty/core";
import type {
	IMailboxComponent,
	IMailboxCompleteAuthRequest,
	IMailboxConnectorSchemaRequest,
	IMailboxConnectorSchemaResponse,
	IMailboxCreateRequest,
	IMailboxCreateResponse,
	IMailboxGetRequest,
	IMailboxGetResponse,
	IMailboxListRequest,
	IMailboxListResponse,
	IMailboxRemoveRequest,
	IMailboxUpdateRequest,
	IMailboxUpdateResponse
} from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import { HttpMethod, HttpStatusCode, type IHttpHeaders } from "@3sixty/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "mailboxRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsMailbox: ITag[] = [
	{
		name: "Mailbox",
		description: "Endpoints for managing email mailboxes."
	}
];

/**
 * The REST routes for mailbox management.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesMailbox(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const mailboxConnectorSchemaRoute: IRestRoute<
		IMailboxConnectorSchemaRequest,
		IMailboxConnectorSchemaResponse
	> = {
		operationId: "mailboxConnectorSchema",
		summary: "Get the configuration schema for a connector.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.GET,
		path: `${baseRouteName}/connectors/:connectorType/schema`,
		handler: async (httpRequestContext, request) =>
			mailboxConnectorSchema(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailboxConnectorSchemaRequest>(),
			examples: [
				{
					id: "mailboxConnectorSchemaRequestExample",
					request: {
						pathParams: { connectorType: "pop3" }
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailboxConnectorSchemaResponse>(),
				examples: [
					{
						id: "mailboxConnectorSchemaResponseExample",
						response: {
							body: []
						}
					}
				]
			}
		]
	};

	// This is the URI registered with the external provider, so its path is fixed for the whole
	// deployment and carries no mailbox identifier. The mailbox is correlated from the state the
	// connector placed in the flow, which the provider returns alongside its own parameters.
	const mailboxCompleteAuthRoute: IRestRoute<IMailboxCompleteAuthRequest, INoContentResponse> = {
		operationId: "mailboxCompleteAuth",
		summary: "Complete an authentication flow an external provider has redirected back from.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.GET,
		path: `${baseRouteName}/authcallback`,
		handler: async (httpRequestContext, request) =>
			mailboxCompleteAuth(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailboxCompleteAuthRequest>(),
			examples: [
				{
					id: "mailboxCompleteAuthRequestExample",
					request: {
						query: {
							state: "01932e8a-1234-7000-abcd-0123456789ab",
							code: "4/example-auth-code"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		],
		// Called by the external provider redirecting the browser back, so there is no caller to
		// authenticate and no tenant on the request.
		skipAuth: true,
		skipTenant: true
	};

	const mailboxCreateRoute: IRestRoute<IMailboxCreateRequest, IMailboxCreateResponse> = {
		operationId: "mailboxCreate",
		summary: "Create a new mailbox.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.POST,
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			mailboxCreate(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IMailboxCreateRequest>(),
			examples: [
				{
					id: "mailboxCreateRequestExample",
					request: {
						body: {
							name: "My Mailbox",
							connectorType: "pop3",
							config: undefined,
							enabled: true
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailboxCreateResponse>(),
				examples: [
					{
						id: "mailboxCreateResponseExample",
						response: {
							statusCode: 201,
							headers: {
								location: "/mailbox/01932e8a-1234-7000-abcd-0123456789ab"
							},
							body: {
								authUrl: "https://accounts.google.com/o/oauth2/v2/auth"
							}
						}
					}
				]
			}
		]
	};

	const mailboxListRoute: IRestRoute<IMailboxListRequest, IMailboxListResponse> = {
		operationId: "mailboxList",
		summary: "List mailboxes with optional cursor-based pagination.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.GET,
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			mailboxList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailboxListRequest>(),
			examples: [
				{
					id: "mailboxListRequestExample",
					request: {}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailboxListResponse>(),
				examples: [
					{
						id: "mailboxListResponseExample",
						response: {
							body: { mailboxes: [] }
						}
					}
				]
			}
		]
	};

	const mailboxGetRoute: IRestRoute<IMailboxGetRequest, IMailboxGetResponse> = {
		operationId: "mailboxGet",
		summary: "Get a mailbox by identifier.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.GET,
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			mailboxGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailboxGetRequest>(),
			examples: [
				{
					id: "mailboxGetRequestExample",
					request: {
						pathParams: { id: "01932e8a-1234-7000-abcd-0123456789ab" }
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailboxGetResponse>(),
				examples: [
					{
						id: "mailboxGetResponseExample",
						response: {
							body: {
								id: "01932e8a-1234-7000-abcd-0123456789ab",
								name: "My Mailbox",
								connectorType: "pop3",
								config: undefined,
								enabled: true
							}
						}
					}
				]
			}
		]
	};

	const mailboxUpdateRoute: IRestRoute<IMailboxUpdateRequest, IMailboxUpdateResponse> = {
		operationId: "mailboxUpdate",
		summary: "Update an existing mailbox.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.PUT,
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			mailboxUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailboxUpdateRequest>(),
			examples: [
				{
					id: "mailboxUpdateRequestExample",
					request: {
						pathParams: { id: "01932e8a-1234-7000-abcd-0123456789ab" },
						body: {
							id: "01932e8a-1234-7000-abcd-0123456789ab",
							name: "Updated Mailbox",
							connectorType: "pop3",
							config: undefined,
							enabled: true
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailboxUpdateResponse>(),
				examples: [
					{
						id: "mailboxUpdateResponseExample",
						response: {
							statusCode: 200,
							body: {
								authUrl: "https://accounts.google.com/o/oauth2/v2/auth"
							}
						}
					}
				]
			}
		]
	};

	const mailboxRemoveRoute: IRestRoute<IMailboxRemoveRequest, INoContentResponse> = {
		operationId: "mailboxRemove",
		summary: "Remove a mailbox and stop polling for it.",
		tag: tagsMailbox[0].name,
		method: HttpMethod.DELETE,
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			mailboxRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailboxRemoveRequest>(),
			examples: [
				{
					id: "mailboxRemoveRequestExample",
					request: {
						pathParams: { id: "01932e8a-1234-7000-abcd-0123456789ab" }
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		]
	};

	return [
		mailboxConnectorSchemaRoute,
		mailboxCompleteAuthRoute,
		mailboxCreateRoute,
		mailboxListRoute,
		mailboxGetRoute,
		mailboxUpdateRoute,
		mailboxRemoveRoute
	];
}

/**
 * Get the configuration schema for a connector.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The schema response.
 */
async function mailboxConnectorSchema(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxConnectorSchemaRequest
): Promise<IMailboxConnectorSchemaResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.pathParams), request.pathParams);
	Guards.stringValue(
		ROUTES_SOURCE,
		nameof(request.pathParams.connectorType),
		request.pathParams.connectorType
	);
	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	const schema = await component.getSchema(request.pathParams.connectorType);

	return { body: schema };
}

/**
 * Create a new mailbox.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @param baseRouteName The base route name for the mailbox routes.
 * @returns The create response with the Location header, and the URL to open when the mailbox
 * must be authenticated before it can be polled.
 */
async function mailboxCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxCreateRequest,
	baseRouteName: string
): Promise<IMailboxCreateResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.body), request.body);
	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	const result = await component.createMailbox(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];
	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(
		headers,
		result.id,
		HttpUrlHelper.combineOriginPath(publicOrigin, `${baseRouteName}/:id`)
	);

	return {
		statusCode: HttpStatusCode.created,
		headers,
		body: { authUrl: result.authUrl }
	};
}

/**
 * List mailboxes with optional cursor-based pagination.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The list response.
 */
async function mailboxList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxListRequest
): Promise<IMailboxListResponse> {
	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	const result = await component.listMailboxes(
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);
	return { body: result };
}

/**
 * Get a mailbox by identifier.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The mailbox response.
 */
async function mailboxGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxGetRequest
): Promise<IMailboxGetResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.pathParams), request.pathParams);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	const mailbox = await component.getMailbox(request.pathParams.id);
	return { body: mailbox };
}

/**
 * Update an existing mailbox.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The URL to open when the updated mailbox must be authenticated before it can be polled.
 */
async function mailboxUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxUpdateRequest
): Promise<IMailboxUpdateResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.pathParams), request.pathParams);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	const result = await component.updateMailbox({ ...request.body, id: request.pathParams.id });

	return { statusCode: HttpStatusCode.ok, body: { authUrl: result.authUrl } };
}

/**
 * Complete an authentication flow, correlating the callback to the pending mailbox.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The no-content response.
 */
async function mailboxCompleteAuth(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxCompleteAuthRequest
): Promise<INoContentResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.query), request.query);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.query.state), request.query.state);

	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	await component.completeAuth(request.query);

	return { statusCode: HttpStatusCode.noContent };
}

/**
 * Remove a mailbox and stop polling for it.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The no-content response.
 */
async function mailboxRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxRemoveRequest
): Promise<INoContentResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.pathParams), request.pathParams);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	await component.removeMailbox(request.pathParams.id);

	return { statusCode: HttpStatusCode.noContent };
}

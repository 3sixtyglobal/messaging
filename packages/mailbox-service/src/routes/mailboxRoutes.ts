// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type ITag
} from "@twin.org/api-models";
import { ContextIdStore } from "@twin.org/context";
import { Coerce, ComponentFactory, Guards } from "@twin.org/core";
import type {
	IMailboxComponent,
	IMailboxConnectorSchemaRequest,
	IMailboxConnectorSchemaResponse,
	IMailboxCreateRequest,
	IMailboxGetRequest,
	IMailboxGetResponse,
	IMailboxListRequest,
	IMailboxListResponse,
	IMailboxRemoveRequest,
	IMailboxUpdateRequest
} from "@twin.org/mailbox-models";
import { nameof } from "@twin.org/nameof";
import { HttpMethod, HttpStatusCode, type IHttpHeaders } from "@twin.org/web";

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

	const mailboxCreateRoute: IRestRoute<IMailboxCreateRequest, ICreatedResponse> = {
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
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "mailboxCreateResponseExample",
						response: {
							statusCode: 201,
							headers: {
								location: "/mailbox/01932e8a-1234-7000-abcd-0123456789ab"
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

	const mailboxUpdateRoute: IRestRoute<IMailboxUpdateRequest, INoContentResponse> = {
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
				type: nameof<INoContentResponse>()
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
 * @returns The create response with the Location header.
 */
async function mailboxCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.body), request.body);
	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	const id = await component.addMailbox(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];
	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(
		headers,
		id,
		HttpUrlHelper.combineOriginPath(publicOrigin, `${baseRouteName}/:id`)
	);

	return { statusCode: HttpStatusCode.created, headers };
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
 * @returns The no-content response.
 */
async function mailboxUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailboxUpdateRequest
): Promise<INoContentResponse> {
	Guards.object(ROUTES_SOURCE, nameof(request.pathParams), request.pathParams);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object(ROUTES_SOURCE, nameof(request.body), request.body);
	const component = ComponentFactory.get<IMailboxComponent>(componentName);
	await component.updateMailbox({ ...request.body, id: request.pathParams.id });
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

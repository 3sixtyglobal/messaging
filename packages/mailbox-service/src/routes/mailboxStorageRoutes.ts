// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext, INoContentResponse, IRestRoute, ITag } from "@3sixty/api-models";
import { Coerce, ComponentFactory, Guards } from "@3sixty/core";
import type {
	IMailStorageComponent,
	IMailStorageGetRequest,
	IMailStorageGetResponse,
	IMailStorageListRequest,
	IMailStorageListResponse,
	IMailStorageRemoveRequest
} from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import { HttpMethod, HttpStatusCode } from "@3sixty/web";

/**
 * The tag to associate with the routes.
 */
export const tagsMailboxStorage: ITag[] = [
	{
		name: "MailboxStorage",
		description: "Endpoints for querying and managing stored emails."
	}
];

/**
 * The REST routes for mail storage.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesMailboxStorage(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const mailStorageListRoute: IRestRoute<IMailStorageListRequest, IMailStorageListResponse> = {
		operationId: "mailboxStorageList",
		summary: "Query stored emails received at or after a given timestamp.",
		tag: tagsMailboxStorage[0].name,
		method: HttpMethod.GET,
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			mailStorageList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailStorageListRequest>(),
			examples: [
				{
					id: "mailStorageListRequestExample",
					request: {
						query: { since: "2026-01-01T00:00:00.000Z" }
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailStorageListResponse>(),
				examples: [
					{
						id: "mailStorageListResponseExample",
						response: {
							body: { emails: [] }
						}
					}
				]
			}
		]
	};

	const mailStorageGetRoute: IRestRoute<IMailStorageGetRequest, IMailStorageGetResponse> = {
		operationId: "mailboxStorageGet",
		summary: "Get a stored email by identifier.",
		tag: tagsMailboxStorage[0].name,
		method: HttpMethod.GET,
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			mailStorageGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailStorageGetRequest>(),
			examples: [
				{
					id: "mailStorageGetRequestExample",
					request: {
						pathParams: { id: "01932e8a-1234-7000-abcd-0123456789ab" }
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IMailStorageGetResponse>(),
				examples: [
					{
						id: "mailStorageGetResponseExample",
						response: {
							body: {
								id: "01932e8a-1234-7000-abcd-0123456789ab",
								mailboxId: "01932e8a-0000-7000-abcd-000000000001",
								receivedAt: "2026-01-01T10:00:00.000Z",
								messageId: "<hello@example.com>",
								from: { address: "sender@example.com" },
								to: [{ address: "recipient@example.com" }],
								subject: "Hello",
								date: "2026-01-01T10:00:00.000Z"
							}
						}
					}
				]
			}
		]
	};

	const mailStorageRemoveRoute: IRestRoute<IMailStorageRemoveRequest, INoContentResponse> = {
		operationId: "mailboxStorageRemove",
		summary: "Remove a stored email by identifier.",
		tag: tagsMailboxStorage[0].name,
		method: HttpMethod.DELETE,
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			mailStorageRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IMailStorageRemoveRequest>(),
			examples: [
				{
					id: "mailStorageRemoveRequestExample",
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

	return [mailStorageListRoute, mailStorageGetRoute, mailStorageRemoveRoute];
}

/**
 * Query stored emails received at or after a given timestamp.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The list response.
 */
async function mailStorageList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailStorageListRequest
): Promise<IMailStorageListResponse> {
	Guards.object("mailboxStorageRoutes", nameof(request.query), request.query);
	Guards.stringValue("mailboxStorageRoutes", nameof(request.query.since), request.query.since);
	const component = ComponentFactory.get<IMailStorageComponent>(componentName);
	const result = await component.query(
		request.query.since,
		request.query.mailboxId,
		request.query.cursor,
		Coerce.integer(request.query?.limit)
	);
	return { body: result };
}

/**
 * Get a stored email by identifier.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The email response.
 */
async function mailStorageGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailStorageGetRequest
): Promise<IMailStorageGetResponse> {
	Guards.object("mailboxStorageRoutes", nameof(request.pathParams), request.pathParams);
	Guards.stringValue("mailboxStorageRoutes", nameof(request.pathParams.id), request.pathParams.id);
	const component = ComponentFactory.get<IMailStorageComponent>(componentName);
	const email = await component.get(request.pathParams.id);
	return { body: email };
}

/**
 * Remove a stored email by identifier.
 * @param httpRequestContext The request context.
 * @param componentName The component name.
 * @param request The request.
 * @returns The no-content response.
 */
async function mailStorageRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IMailStorageRemoveRequest
): Promise<INoContentResponse> {
	Guards.object("mailboxStorageRoutes", nameof(request.pathParams), request.pathParams);
	Guards.stringValue("mailboxStorageRoutes", nameof(request.pathParams.id), request.pathParams.id);
	const component = ComponentFactory.get<IMailStorageComponent>(componentName);
	await component.remove(request.pathParams.id);
	return { statusCode: HttpStatusCode.noContent };
}

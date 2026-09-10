// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext, INoContentResponse, IRestRoute } from "@twin.org/api-models";
import { ComponentFactory } from "@twin.org/core";
import type {
	IMailboxCompleteAuthRequest,
	IMailboxComponent,
	IMailboxCreateRequest,
	IMailboxCreateResponse,
	IMailboxUpdateRequest,
	IMailboxUpdateResponse
} from "@twin.org/mailbox-models";
import { HeaderTypes } from "@twin.org/web";
import { generateRestRoutesMailbox } from "../src/routes/mailboxRoutes.js";

const COMPONENT_NAME = "test-mailbox";

const REQUEST_CONTEXT = {} as unknown as IHttpRequestContext;

function registerComponent(completeAuth: (authPayload: unknown) => Promise<void>): void {
	ComponentFactory.register(COMPONENT_NAME, () => {
		const component = {
			className: () => "TestMailboxComponent",
			completeAuth
		};
		return component as unknown as IMailboxComponent;
	});
}

function authCallbackRoute(): IRestRoute<IMailboxCompleteAuthRequest, INoContentResponse> {
	const routes = generateRestRoutesMailbox("mailbox", COMPONENT_NAME);
	const route = routes.find(r => r.operationId === "mailboxCompleteAuth");
	expect(route).toBeDefined();
	return route as IRestRoute<IMailboxCompleteAuthRequest, INoContentResponse>;
}

function createRoute(): IRestRoute<IMailboxCreateRequest, IMailboxCreateResponse> {
	const routes = generateRestRoutesMailbox("mailbox", COMPONENT_NAME);
	const route = routes.find(r => r.operationId === "mailboxCreate");
	expect(route).toBeDefined();
	return route as IRestRoute<IMailboxCreateRequest, IMailboxCreateResponse>;
}

function updateRoute(): IRestRoute<IMailboxUpdateRequest, IMailboxUpdateResponse> {
	const routes = generateRestRoutesMailbox("mailbox", COMPONENT_NAME);
	const route = routes.find(r => r.operationId === "mailboxUpdate");
	expect(route).toBeDefined();
	return route as IRestRoute<IMailboxUpdateRequest, IMailboxUpdateResponse>;
}

describe("mailboxRoutes", () => {
	test("mounts the auth callback under the mailbox base route", () => {
		const route = authCallbackRoute();

		// The path has to match the URI registered with the provider, with no mailbox identifier.
		expect(route.path).toBe("mailbox/authcallback");
		expect(route.method).toBe("GET");
		// The provider calls this, so there is no caller to authenticate and no tenant header.
		expect(route.skipAuth).toBe(true);
		expect(route.skipTenant).toBe(true);
	});

	test("matches the fixed auth callback ahead of the routes with an id segment", () => {
		const routes = generateRestRoutesMailbox("mailbox", COMPONENT_NAME);
		const callbackIndex = routes.findIndex(r => r.operationId === "mailboxCompleteAuth");
		const firstIdIndex = routes.findIndex(r => r.path.includes(":id"));

		expect(callbackIndex).toBeGreaterThanOrEqual(0);
		expect(firstIdIndex).toBeGreaterThanOrEqual(0);
		expect(callbackIndex).toBeLessThan(firstIdIndex);
	});

	test("passes the whole redirect query to the component", async () => {
		const payloads: unknown[] = [];
		registerComponent(async authPayload => {
			payloads.push(authPayload);
		});

		const response = await authCallbackRoute().handler(REQUEST_CONTEXT, {
			query: { state: "mailbox-abc", code: "4/example-auth-code", scope: "gmail.readonly" }
		});

		expect(payloads).toEqual([
			{ state: "mailbox-abc", code: "4/example-auth-code", scope: "gmail.readonly" }
		]);
		// Nothing is returned, the provider is the caller and would not process a body.
		expect(response.statusCode).toBe(204);
	});

	test("returns the auth URL the component produced alongside the created location", async () => {
		ComponentFactory.register(COMPONENT_NAME, () => {
			const component = {
				className: () => "TestMailboxComponent",
				createMailbox: async () => ({
					id: "01932e8a-1234-7000-abcd-0123456789ab",
					authUrl: "https://accounts.google.com/o/oauth2"
				})
			};
			return component as unknown as IMailboxComponent;
		});

		const response = await createRoute().handler(REQUEST_CONTEXT, {
			body: { name: "My Mailbox", connectorType: "gmail", enabled: true, config: undefined }
		});

		expect(response.statusCode).toBe(201);
		expect(response.headers[HeaderTypes.Location]).toContain(
			"01932e8a-1234-7000-abcd-0123456789ab"
		);
		// The operator who created the mailbox needs the consent URL without polling for it.
		expect(response.body).toEqual({ authUrl: "https://accounts.google.com/o/oauth2" });
	});

	test("returns no auth URL when the connector needs no authentication flow", async () => {
		ComponentFactory.register(COMPONENT_NAME, () => {
			const component = {
				className: () => "TestMailboxComponent",
				createMailbox: async () => ({ id: "01932e8a-1234-7000-abcd-0123456789ab" })
			};
			return component as unknown as IMailboxComponent;
		});

		const response = await createRoute().handler(REQUEST_CONTEXT, {
			body: { name: "My Mailbox", connectorType: "pop3", enabled: true, config: undefined }
		});

		expect(response.body).toEqual({ authUrl: undefined });
	});

	test("returns the auth URL an update produced", async () => {
		ComponentFactory.register(COMPONENT_NAME, () => {
			const component = {
				className: () => "TestMailboxComponent",
				updateMailbox: async () => ({ authUrl: "https://accounts.google.com/o/oauth2" })
			};
			return component as unknown as IMailboxComponent;
		});

		const response = await updateRoute().handler(REQUEST_CONTEXT, {
			pathParams: { id: "01932e8a-1234-7000-abcd-0123456789ab" },
			body: {
				id: "01932e8a-1234-7000-abcd-0123456789ab",
				name: "My Mailbox",
				connectorType: "gmail",
				enabled: true,
				config: undefined
			}
		});

		// An update replaces the credentials, so the operator may have to authenticate again.
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ authUrl: "https://accounts.google.com/o/oauth2" });
	});

	test("throws when the redirect carries no state to correlate", async () => {
		registerComponent(async () => {});

		await expect(
			authCallbackRoute().handler(REQUEST_CONTEXT, {
				query: { code: "4/example-auth-code" } as unknown as { state: string }
			})
		).rejects.toThrow("guard.string");
	});
});

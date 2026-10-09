// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import { ComponentFactory } from "@3sixty/core";
import type { IError } from "@3sixty/core";
import {
	EmailProtocolConnectorFactory,
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory,
	type IEmail,
	type IEmailProtocolConnectorAuthState,
	type IEmailProtocolConnectorOptions
} from "@3sixty/mailbox-models";
import {
	ConfidentialClientApplication,
	type AccountInfo,
	type AuthenticationResult
} from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { TEST_OUTLOOK_CONFIG } from "./setupTestEnv.js";
import { OutlookEmailConnectorConfigSchema } from "../src/connectorSchema/outlookEmailConnectorConfigSchema.js";
import { OutlookEmailConnectorStateSchema } from "../src/connectorSchema/outlookEmailConnectorStateSchema.js";
import type { IOutlookEmailConnectorState } from "../src/models/IOutlookEmailConnectorState.js";
import { OutlookEmailConnector } from "../src/outlookEmailConnector.js";

// The Microsoft cache schema and the Microsoft Graph delta responses both use property names
// which cannot be written as identifiers, so they are named here and used as computed keys.
const HOME_ACCOUNT_ID_KEY = "home_account_id";
const LOCAL_ACCOUNT_ID_KEY = "local_account_id";
const AUTHORITY_TYPE_KEY = "authority_type";
const CREDENTIAL_TYPE_KEY = "credential_type";
const CLIENT_ID_KEY = "client_id";
const NEXT_LINK_KEY = "@odata.nextLink";
const DELTA_LINK_KEY = "@odata.deltaLink";
const REMOVED_KEY = "@removed";

// The owning component supplies a single fixed callback URI for the whole deployment, along
// with the state which correlates a consent response back to the mailbox and its partition.
const TEST_OPTIONS: IEmailProtocolConnectorOptions = {
	callbackUri: "https://app.example.com/mailbox/authcallback",
	correlationState: "test-tenant/mailbox-abc"
};

const TEST_ACCOUNT_ID = "uid.utid";
const TEST_ENVIRONMENT = "login.microsoftonline.com";

const TEST_CLIENT_CERTIFICATE = JSON.stringify({
	privateKey: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n",
	thumbprintSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
});

/**
 * Build a serialized token cache in the Microsoft cache schema, as the consent flow leaves
 * behind and as the connector state carries between polls.
 * @param options The account and refresh token the cache holds.
 * @param options.accountId The identifier of the account the cache holds.
 * @param options.username The address of the account the cache holds.
 * @param options.withRefreshToken Whether the cache holds a refresh token.
 * @returns The serialized cache.
 */
function tokenCache(options?: {
	accountId?: string;
	username?: string;
	withRefreshToken?: boolean;
}): string {
	const accountId = options?.accountId ?? TEST_ACCOUNT_ID;
	const account = {
		[HOME_ACCOUNT_ID_KEY]: accountId,
		environment: TEST_ENVIRONMENT,
		realm: TEST_OUTLOOK_CONFIG.tenantId,
		[LOCAL_ACCOUNT_ID_KEY]: accountId.split(".")[0],
		username: options?.username ?? TEST_OUTLOOK_CONFIG.emailAddress,
		[AUTHORITY_TYPE_KEY]: "MSSTS"
	};
	const refreshToken = {
		[HOME_ACCOUNT_ID_KEY]: accountId,
		environment: TEST_ENVIRONMENT,
		[CREDENTIAL_TYPE_KEY]: "RefreshToken",
		[CLIENT_ID_KEY]: TEST_OUTLOOK_CONFIG.clientId,
		secret: "test-refresh-token"
	};

	return JSON.stringify({
		Account: { [`${accountId}-${TEST_ENVIRONMENT}-${TEST_OUTLOOK_CONFIG.tenantId}`]: account },
		IdToken: {},
		AccessToken: {},
		RefreshToken:
			options?.withRefreshToken === false
				? {}
				: {
						[`${accountId}-${TEST_ENVIRONMENT}-refreshtoken-${TEST_OUTLOOK_CONFIG.clientId}--`]:
							refreshToken
					},
		AppMetadata: {}
	});
}

/**
 * The state of a mailbox which has already given consent, so it is polled with the credentials
 * carried in its state rather than being asked for consent again.
 * @param state Any further state to merge in.
 * @returns The connector state.
 */
function authenticatedState(state?: IOutlookEmailConnectorState): IOutlookEmailConnectorState {
	return { tokenCache: tokenCache(), accountId: TEST_ACCOUNT_ID, ...state };
}

/**
 * The account a live authorisation code exchange reports, built from the identity token.
 * @param options The address and identifier of the consenting account.
 * @param options.accountId The identifier of the consenting account.
 * @param options.username The address of the consenting account.
 * @returns The account.
 */
function consentedAccount(options?: { accountId?: string; username?: string }): AccountInfo {
	return {
		homeAccountId: options?.accountId ?? TEST_ACCOUNT_ID,
		environment: TEST_ENVIRONMENT,
		tenantId: TEST_OUTLOOK_CONFIG.tenantId,
		username: options?.username ?? TEST_OUTLOOK_CONFIG.emailAddress,
		localAccountId: (options?.accountId ?? TEST_ACCOUNT_ID).split(".")[0]
	};
}

/**
 * The result the identity platform returns from its token endpoint.
 * @param accessToken The access token the result carries.
 * @param account The account the token was issued for.
 * @returns The result.
 */
function authResult(accessToken: string, account?: AccountInfo): AuthenticationResult {
	return {
		authority: `https://${TEST_ENVIRONMENT}/${TEST_OUTLOOK_CONFIG.tenantId}`,
		uniqueId: (account?.homeAccountId ?? TEST_ACCOUNT_ID).split(".")[0],
		tenantId: TEST_OUTLOOK_CONFIG.tenantId,
		scopes: ["https://graph.microsoft.com/Mail.Read"],
		account: account ?? null,
		idToken: "",
		idTokenClaims: {},
		accessToken,
		fromCache: false,
		expiresOn: new Date(Date.now() + 3600000),
		tokenType: "Bearer",
		correlationId: "test-correlation-id"
	};
}

function makeScheduler(): {
	scheduler: ITaskSchedulerComponent;
	runPending: () => Promise<void>;
} {
	let pending: (() => Promise<void>) | undefined;
	const scheduler: ITaskSchedulerComponent = {
		className: () => "TestScheduler",
		addTask: async (taskId: string, times: unknown[], callback: () => Promise<void>) => {
			pending = callback;
		},
		removeTask: async () => {
			pending = undefined;
		},
		tasksInfo: async () => ({ tasks: [] })
	} as unknown as ITaskSchedulerComponent;
	return {
		scheduler,
		runPending: async () => {
			if (pending !== undefined) {
				await pending();
			}
		}
	};
}

function rawEmail(subject: string, from: string, body: string): string {
	return [
		`From: ${from}`,
		"To: recipient@example.com",
		`Subject: ${subject}`,
		"MIME-Version: 1.0",
		"Content-Type: text/plain",
		"",
		body
	].join("\r\n");
}

interface IDeltaEntry {
	id: string;
	receivedDateTime?: string;
	categories?: string[];
	[REMOVED_KEY]?: { reason: string };
}

function deltaMessage(id: string, receivedDateTime: string, categories?: string[]): IDeltaEntry {
	return categories === undefined ? { id, receivedDateTime } : { id, receivedDateTime, categories };
}

function removedMessage(id: string): IDeltaEntry {
	return { id, [REMOVED_KEY]: { reason: "deleted" } };
}

function deltaPage(
	messages: IDeltaEntry[],
	links?: { nextLink?: string; deltaLink?: string }
): { [key: string]: unknown } {
	const page: { [key: string]: unknown } = { value: messages };

	if (links?.nextLink !== undefined) {
		page[NEXT_LINK_KEY] = links.nextLink;
	}
	if (links?.deltaLink !== undefined) {
		page[DELTA_LINK_KEY] = links.deltaLink;
	}

	return page;
}

interface IFakeRequest {
	responseType: () => IFakeRequest;
	get: () => Promise<unknown>;
}

interface IFakeGraph {
	client: Client;
	api: ReturnType<typeof vi.fn>;
	delta: ReturnType<typeof vi.fn>;
	content: ReturnType<typeof vi.fn>;
	deltaLinks: () => string[];
}

/**
 * A Microsoft Graph client which answers the two calls the connector makes, the delta cursor of
 * a folder and the raw content of a message.
 * @param raws The raw MIME content keyed by message identifier.
 * @returns The client and the mocks behind it.
 */
function makeGraph(raws: { [messageId: string]: string }): IFakeGraph {
	const delta = vi.fn(async (link: string) => deltaPage([], { deltaLink: "delta-head" }));
	const content = vi.fn(async (messageId: string) => raws[messageId]);
	const links: string[] = [];

	const api = vi.fn((link: string) => {
		const request: IFakeRequest = {
			responseType: () => request,
			get: async () => {
				if (link.includes("/$value")) {
					const messageId = link.slice(
						link.lastIndexOf("/messages/") + "/messages/".length,
						link.lastIndexOf("/$value")
					);
					return content(decodeURIComponent(messageId));
				}
				links.push(link);
				return delta(link);
			}
		};
		return request;
	});

	return {
		client: { api } as unknown as Client,
		api,
		delta,
		content,
		deltaLinks: () => links
	};
}

function installGraph(fake: IFakeGraph): void {
	vi.spyOn(Client, "initWithMiddleware").mockReturnValue(fake.client);
}

function installAccessToken(): ReturnType<typeof vi.spyOn> {
	return vi
		.spyOn(ConfidentialClientApplication.prototype, "acquireTokenSilent")
		.mockResolvedValue(authResult("test-access-token"));
}

function installAppOnlyAccessToken(): ReturnType<typeof vi.spyOn> {
	return vi
		.spyOn(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential")
		.mockResolvedValue(authResult("test-app-access-token"));
}

function installConsentUrl(): ReturnType<typeof vi.spyOn> {
	// The identity library reaches the identity platform for its metadata before it builds the
	// URL, so the URL it would produce is stood in for here.
	return vi
		.spyOn(ConfidentialClientApplication.prototype, "getAuthCodeUrl")
		.mockImplementation(async request => {
			const url = new URL(
				`https://${TEST_ENVIRONMENT}/${TEST_OUTLOOK_CONFIG.tenantId}/oauth2/v2.0/authorize`
			);
			url.searchParams.set("client_id", TEST_OUTLOOK_CONFIG.clientId);
			url.searchParams.set("redirect_uri", request.redirectUri);
			url.searchParams.set("scope", request.scopes.join(" "));
			url.searchParams.set("state", request.state ?? "");
			url.searchParams.set("login_hint", request.loginHint ?? "");
			url.searchParams.set("prompt", request.prompt ?? "");
			return url.toString();
		});
}

/**
 * Stand in for the authorisation code exchange, which fills the token cache of the client it is
 * called on and reports the account which gave consent.
 * @param options The account the consent came from and whether a refresh token was issued.
 * @param options.accountId The identifier of the consenting account.
 * @param options.username The address of the consenting account.
 * @param options.withRefreshToken Whether the exchange issued a refresh token.
 * @returns The spy on the exchange.
 */
function installCodeExchange(options?: {
	accountId?: string;
	username?: string;
	withRefreshToken?: boolean;
}): ReturnType<typeof vi.spyOn> {
	return vi
		.spyOn(ConfidentialClientApplication.prototype, "acquireTokenByCode")
		.mockImplementation(async function fillTokenCache(this: ConfidentialClientApplication) {
			this.getTokenCache().deserialize(tokenCache(options));

			return authResult("test-access-token", consentedAccount(options));
		});
}

function apiError(message: string, statusCode: number): Error {
	return Object.assign(new Error(message), { statusCode });
}

function oauthError(message: string, errorCode: string): Error {
	return Object.assign(new Error(message), { errorCode });
}

describe("OutlookEmailConnector", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);
	});

	test("can register in the factory", () => {
		EmailProtocolConnectorFactory.register(
			OutlookEmailConnector.NAMESPACE,
			config => new OutlookEmailConnector({ config: config as typeof TEST_OUTLOOK_CONFIG })
		);
		const connector = EmailProtocolConnectorFactory.create(
			OutlookEmailConnector.NAMESPACE,
			TEST_OUTLOOK_CONFIG
		);
		expect(connector).toBeDefined();
		expect(connector.className()).toBe("OutlookEmailConnector");
	});

	test("NAMESPACE is outlook", () => {
		expect(OutlookEmailConnector.NAMESPACE).toBe("outlook");
	});

	test("OutlookEmailConnectorConfigSchema declares isSecure on the credential fields", () => {
		const secureFields = OutlookEmailConnectorConfigSchema.filter(f => f.isSecure).map(
			f => f.propertyKey
		);
		expect(secureFields).toEqual(["clientSecret", "clientCertificate"]);
	});

	test("OutlookEmailConnectorConfigSchema declares the required OAuth fields", () => {
		const propertyKeys = OutlookEmailConnectorConfigSchema.map(f => f.propertyKey);
		expect(propertyKeys).toContain("emailAddress");
		expect(propertyKeys).toContain("tenantId");
		expect(propertyKeys).toContain("clientId");
		expect(propertyKeys).toContain("clientSecret");
		// The refresh token is issued by the consent flow, so it belongs to the state schema.
		expect(propertyKeys).not.toContain("tokenCache");
		expect(propertyKeys).not.toContain("refreshToken");
	});

	test("OutlookEmailConnectorStateSchema describes every state property", () => {
		// The schema is what the owning component persists the state through, so a property
		// missing from it is a property the component cannot classify.
		expect(OutlookEmailConnectorStateSchema.map(f => f.propertyKey)).toEqual([
			"tokenCache",
			"accountId",
			"deltaLinks",
			"syncNextLinks",
			"syncCompletedFolderIds",
			"syncFromDateTime",
			"initialSyncComplete",
			"lastReceivedDateTime",
			"deliveredMessageIds"
		]);
	});

	test("OutlookEmailConnectorStateSchema marks only the token cache as secure", () => {
		expect(OutlookEmailConnectorStateSchema.filter(f => f.isSecure)).toEqual([
			{
				labelKey: "outlookEmailConnectorStateSchema.tokenCache",
				propertyKey: "tokenCache",
				type: "string",
				isSecure: true
			}
		]);
	});

	test("OutlookEmailConnectorStateSchema types the collection properties", () => {
		const byKey = Object.fromEntries(OutlookEmailConnectorStateSchema.map(f => [f.propertyKey, f]));

		expect(byKey.deltaLinks.type).toBe("object");
		expect(byKey.syncNextLinks.type).toBe("object");
		expect(byKey.initialSyncComplete.type).toBe("boolean");
		expect(byKey.syncCompletedFolderIds).toMatchObject({ type: "array", itemType: "string" });
		expect(byKey.deliveredMessageIds).toMatchObject({ type: "array", itemType: "string" });
	});

	test("OutlookEmailConnectorStateSchema can be registered in the state schema factory", () => {
		EmailProtocolConnectorStateSchemaFactory.register(
			OutlookEmailConnector.NAMESPACE,
			() => OutlookEmailConnectorStateSchema
		);

		expect(EmailProtocolConnectorStateSchemaFactory.get(OutlookEmailConnector.NAMESPACE)).toEqual(
			OutlookEmailConnectorStateSchema
		);
	});

	test("OutlookEmailConnectorConfigSchema can be registered in schema factory", () => {
		EmailProtocolConnectorConfigSchemaFactory.register(
			OutlookEmailConnector.NAMESPACE,
			() => OutlookEmailConnectorConfigSchema
		);
		const schema = EmailProtocolConnectorConfigSchemaFactory.get(OutlookEmailConnector.NAMESPACE);
		expect(schema).toHaveLength(OutlookEmailConnectorConfigSchema.length);
	});

	test("throws when the email address is missing", () => {
		expect(
			() => new OutlookEmailConnector({ config: { ...TEST_OUTLOOK_CONFIG, emailAddress: "" } })
		).toThrow();
	});

	test("throws when the tenant is missing", () => {
		expect(
			() => new OutlookEmailConnector({ config: { ...TEST_OUTLOOK_CONFIG, tenantId: "" } })
		).toThrow();
	});

	test("throws when the client identifier is missing", () => {
		expect(
			() => new OutlookEmailConnector({ config: { ...TEST_OUTLOOK_CONFIG, clientId: "" } })
		).toThrow();
	});

	test("throws when neither a client secret nor a certificate are supplied", () => {
		expect(
			() =>
				new OutlookEmailConnector({
					config: {
						emailAddress: "ingest@example.com",
						tenantId: "test-tenant-id",
						clientId: "test-client-id"
					}
				})
		).toThrow("outlookEmailConnector.missingClientCredential");
	});

	test("accepts an app registration with no credentials in its state so consent can be requested", () => {
		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		expect(connector.className()).toBe("OutlookEmailConnector");
	});

	test("OutlookEmailConnectorConfigSchema defaults the folders to the inbox", () => {
		const folderField = OutlookEmailConnectorConfigSchema.find(f => f.propertyKey === "folderIds");
		expect(folderField).toBeDefined();
		expect(folderField?.defaultValue).toEqual(["inbox"]);
	});

	test("OutlookEmailConnectorConfigSchema does not expose the callback URI", () => {
		// The callback URI is fixed for the deployment and supplied by the mailbox service, so it
		// must never be presented as a per-mailbox field.
		const propertyKeys = OutlookEmailConnectorConfigSchema.map(f => f.propertyKey);
		expect(propertyKeys).not.toContain("redirectUri");
		expect(propertyKeys).not.toContain("callbackUri");
	});

	test("throws when the client certificate is not a valid credential", () => {
		expect(
			() =>
				new OutlookEmailConnector({
					config: { ...TEST_OUTLOOK_CONFIG, clientSecret: undefined, clientCertificate: "not-json" }
				})
		).toThrow("outlookEmailConnector.invalidClientCertificate");

		expect(
			() =>
				new OutlookEmailConnector({
					config: {
						...TEST_OUTLOOK_CONFIG,
						clientSecret: undefined,
						clientCertificate: JSON.stringify({ privateKey: "a-key" })
					}
				})
		).toThrow("outlookEmailConnector.invalidClientCertificate");
	});

	test("accepts a client certificate without a client secret", () => {
		const connector = new OutlookEmailConnector({
			config: {
				...TEST_OUTLOOK_CONFIG,
				clientSecret: undefined,
				clientCertificate: TEST_CLIENT_CERTIFICATE
			}
		});
		expect(connector.className()).toBe("OutlookEmailConnector");
	});

	test("retrieveStop does not throw when not started", async () => {
		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		await expect(connector.retrieveStop()).resolves.not.toThrow();
	});
});

describe("OutlookEmailConnector monitoring", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test("requests consent through the auth callback when there is no token cache", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installAccessToken();
		const fake = makeGraph({});
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		let authRequired = false;
		let authState: IEmailProtocolConnectorAuthState | undefined;
		let authError: IError | undefined;
		const retrievals: number[] = [];

		await connector.retrieve(
			"mailbox-abc",
			{},
			async (mailboxId, updatedState, requiresAuth, callbackAuthState, callbackError) => {
				authRequired = requiresAuth;
				authState = callbackAuthState;
				authError = callbackError;
			},
			async () => {
				retrievals.push(1);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		// Awaiting consent is not a failure, so no error is reported.
		expect(authError).toBeUndefined();
		expect(authState?.authUrl).toContain("login.microsoftonline.com");
		// Microsoft Graph must not be called at all while consent is outstanding.
		expect(fake.api).not.toHaveBeenCalled();
		expect(retrievals).toHaveLength(0);
	});

	test("carries the correlation state and address through the consent URL", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		let authUrl: string | undefined;
		await connector.retrieve(
			"mailbox-abc",
			{},
			async (mailboxId, updatedState, requiresAuth, callbackAuthState) => {
				authUrl = callbackAuthState?.authUrl;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		const params = new URL(authUrl ?? "").searchParams;
		// The redirect handler needs the correlation state back to know which mailbox to update.
		expect(params.get("state")).toBe(TEST_OPTIONS.correlationState);
		expect(params.get("login_hint")).toBe("ingest@example.com");
		expect(params.get("redirect_uri")).toBe(TEST_OPTIONS.callbackUri);
		expect(params.get("scope")).toBe("https://graph.microsoft.com/Mail.Read");
		expect(params.get("prompt")).toBe("consent");
	});

	test("initiateAuth produces a consent URL before the mailbox has ever been polled", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		const authState = await connector.initiateAuth("mailbox-abc", {}, TEST_OPTIONS);

		const params = new URL(authState?.authUrl ?? "").searchParams;
		expect(params.get("state")).toBe(TEST_OPTIONS.correlationState);
		expect(params.get("redirect_uri")).toBe(TEST_OPTIONS.callbackUri);
		expect(params.get("login_hint")).toBe("ingest@example.com");
	});

	test("initiateAuth asks for nothing when the state already carries credentials", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		await expect(
			connector.initiateAuth("mailbox-abc", authenticatedState(), TEST_OPTIONS)
		).resolves.toBeUndefined();
	});

	test("initiateAuth asks for nothing when application only access is configured", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, appOnlyAccess: true }
		});

		await expect(connector.initiateAuth("mailbox-abc", {}, TEST_OPTIONS)).resolves.toBeUndefined();
	});

	test("requests consent when the token cache holds no account for the mailbox", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		const silent = installAccessToken();
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		let authRequired = false;
		await connector.retrieve(
			"mailbox-abc",
			// A cache restored without the account the consent flow recorded cannot produce a
			// token for the mailbox, so consent is asked for rather than a token acquired.
			{ tokenCache: tokenCache({ accountId: "other.utid" }), accountId: TEST_ACCOUNT_ID },
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		expect(silent).not.toHaveBeenCalled();
	});

	test("polls normally once the consent flow has supplied credentials", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		let authRequired = false;
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"mailbox-abc",
			authenticatedState(),
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(false);
		expect(retrieved.map(m => m.subject)).toEqual(["First message"]);
	});

	test("sends the consent flow to the callback URI supplied by the owner", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		const fake = makeGraph({});
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		let authState: IEmailProtocolConnectorAuthState | undefined;

		await connector.retrieve(
			"mailbox-abc",
			{},
			async (mailboxId, updatedState, requiresAuth, callbackAuthState) => {
				authState = callbackAuthState;
			},
			async () => true,
			{
				callbackUri: "https://other.example.com/mailbox/authcallback",
				correlationState: TEST_OPTIONS.correlationState
			}
		);
		await runPending();

		expect(new URL(authState?.authUrl ?? "").searchParams.get("redirect_uri")).toBe(
			"https://other.example.com/mailbox/authcallback"
		);
		expect(fake.api).not.toHaveBeenCalled();
	});

	test("polls without a callback URI and reports auth with no consent URL", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const retrieved: IEmail[] = [];

		// A mailbox stored before an origin was captured has no URI for a flow to return to, but
		// the credentials it already holds are enough to keep polling.
		await connector.retrieve(
			"mailbox-abc",
			authenticatedState(),
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			{ correlationState: TEST_OPTIONS.correlationState }
		);
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["First message"]);

		// Consent cannot be requested without somewhere for it to return to.
		let authState: IEmailProtocolConnectorAuthState | undefined;
		await connector.retrieve(
			"mailbox-abc",
			{},
			async (mailboxId, updatedState, requiresAuth, callbackAuthState) => {
				authState = callbackAuthState;
			},
			async () => true,
			{ correlationState: TEST_OPTIONS.correlationState }
		);
		await runPending();

		expect(authState).toBeUndefined();
	});

	test("monitors the mailbox using application permissions", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const appOnly = installAppOnlyAccessToken();
		const silent = installAccessToken();
		const fake = makeGraph({ m1: rawEmail("Shared mailbox", "alice@example.com", "Body.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, appOnlyAccess: true }
		});

		let authRequired = false;
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"mailbox-abc",
			{},
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// No user is present to consent, the app registration authenticates on its own.
		expect(authRequired).toBe(false);
		expect(retrieved.map(m => m.subject)).toEqual(["Shared mailbox"]);
		expect(appOnly).toHaveBeenCalled();
		expect(silent).not.toHaveBeenCalled();
		expect(fake.deltaLinks()[0]).toContain("/users/ingest%40example.com/");
	});

	test("acquires an access token before calling Microsoft Graph", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const silent = installAccessToken();
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(silent).toHaveBeenCalled();
	});

	test("requests only the properties it needs from the delta cursor", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({});
		installGraph(fake);

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, maxMessagesPerPoll: 25 }
		});
		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		const link = fake.deltaLinks()[0];
		expect(link).toContain("/mailFolders/inbox/messages/delta");
		expect(link).toContain("$select=id,receivedDateTime,categories");
		expect(link).toContain("$top=25");
	});

	test("delivers the existing messages oldest first and records the delta cursor", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		// A delta cursor does not order what it reports.
		fake.delta.mockResolvedValue(
			deltaPage(
				[deltaMessage("m2", "2026-09-10T10:00:00Z"), deltaMessage("m1", "2026-09-10T09:00:00Z")],
				{ deltaLink: "delta-head" }
			)
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState();
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["First message", "Second message"]);
		expect(retrieved[0].from?.address).toBe("alice@example.com");
		expect(retrieved[0].textContent).toContain("Body one.");
		expect(state.deltaLinks).toEqual({ inbox: "delta-head" });
		expect(state.initialSyncComplete).toBe(true);
		expect(state.lastReceivedDateTime).toBe("2026-09-10T10:00:00Z");
		expect(state.deliveredMessageIds).toEqual(["m1", "m2"]);
		// The walk is finished, so the fields which tracked it are cleared.
		expect(state.syncNextLinks).toBeUndefined();
		expect(state.syncCompletedFolderIds).toBeUndefined();
	});

	test("delivers the Outlook categories as the protocol flags of the email", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("Categorised", "alice@example.com", "Body.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z", ["Orders", "Urgent"])], {
				deltaLink: "delta-head"
			})
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(retrieved[0].flags).toEqual(["Orders", "Urgent"]);
	});

	test("skips a message which has left the folder", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("Still here", "alice@example.com", "Body.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z"), removedMessage("m2")], {
				deltaLink: "delta-head"
			})
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// A deleted message has no content to fetch.
		expect(retrieved.map(m => m.subject)).toEqual(["Still here"]);
		expect(fake.content).toHaveBeenCalledTimes(1);
	});

	test("keeps the page link when more of the folder remains to be walked", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { nextLink: "sync-page-2" })
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState();

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(state.syncNextLinks).toEqual({ inbox: "sync-page-2" });
		expect(state.initialSyncComplete).toBeUndefined();
		expect(state.deltaLinks).toBeUndefined();
	});

	test("follows the page link on the next cycle rather than starting again", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		fake.delta
			.mockResolvedValueOnce(
				deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { nextLink: "sync-page-2" })
			)
			.mockResolvedValueOnce(
				deltaPage([deltaMessage("m2", "2026-09-10T10:00:00Z")], { deltaLink: "delta-head" })
			);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState();
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["First message", "Second message"]);
		expect(fake.deltaLinks()[1]).toBe("sync-page-2");
		expect(state.initialSyncComplete).toBe(true);
		expect(state.deltaLinks).toEqual({ inbox: "delta-head" });
	});

	test("delivers new messages from the delta cursor and never delivers one twice", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState();
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(retrieved.map(m => m.subject)).toEqual(["First message"]);

		// A delta cursor repeats the message it was issued at, so m1 comes back as well.
		fake.delta.mockResolvedValue(
			deltaPage(
				[deltaMessage("m1", "2026-09-10T09:00:00Z"), deltaMessage("m2", "2026-09-10T10:00:00Z")],
				{ deltaLink: "delta-head-2" }
			)
		);
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["First message", "Second message"]);
		expect(state.deltaLinks).toEqual({ inbox: "delta-head-2" });
		expect(fake.content.mock.calls.filter(call => call[0] === "m1")).toHaveLength(1);

		// A third poll with no further changes must deliver nothing.
		fake.delta.mockResolvedValue(deltaPage([], { deltaLink: "delta-head-3" }));
		await runPending();
		expect(retrieved.map(m => m.subject)).toEqual(["First message", "Second message"]);
	});

	test("skips a message the delta cursor reports again after it was only touched", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("Old message", "alice@example.com", "Body one."),
			m2: rawEmail("New message", "bob@example.com", "Body two.")
		});
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		// The identifier history is deliberately too short to remember m1, so what keeps it from
		// being delivered again is the receipt time delivery has reached.
		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, maxDeliveredIdHistory: 1 }
		});
		const state: IOutlookEmailConnectorState = authenticatedState();
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(retrieved.map(m => m.subject)).toEqual(["Old message"]);

		// A newer message arrives, which pushes m1 out of the identifier history.
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m2", "2026-09-10T11:00:00Z")], { deltaLink: "delta-head-2" })
		);
		await runPending();
		expect(state.deliveredMessageIds).toEqual(["m2"]);

		// A delta cursor reports a message again when its read state changes, and that must not
		// be mistaken for a new arrival.
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head-3" })
		);
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["Old message", "New message"]);
	});

	test("redelivers a message whose persist failed on the next poll", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("Persisted message", "alice@example.com", "Body one."),
			m2: rawEmail("Failed message", "bob@example.com", "Body two.")
		});
		fake.delta.mockResolvedValue(
			deltaPage(
				[deltaMessage("m1", "2026-09-10T09:00:00Z"), deltaMessage("m2", "2026-09-10T10:00:00Z")],
				{ deltaLink: "delta-head" }
			)
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState();

		const firstPoll: IEmail[] = [];
		let firstPollCalls = 0;
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				firstPollCalls++;
				if (message) {
					firstPoll.push(message);
				}
				return firstPoll.length < 2;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(firstPoll.map(m => m.subject)).toEqual(["Persisted message", "Failed message"]);
		// The aborted cycle must not flush the wound back state back over the caller.
		expect(firstPollCalls).toBe(2);
		// The failed message must not be recorded, and the page must not be marked as walked.
		expect(state.deliveredMessageIds).toEqual(["m1"]);
		expect(state.lastReceivedDateTime).toBe("2026-09-10T09:00:00Z");
		expect(state.initialSyncComplete).toBeUndefined();

		const secondPoll: IEmail[] = [];
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					secondPoll.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(secondPoll.map(m => m.subject)).toEqual(["Failed message"]);
		expect(state.initialSyncComplete).toBe(true);

		const thirdPoll: IEmail[] = [];
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					thirdPoll.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(thirdPoll).toHaveLength(0);
	});

	test("restarts the folder sync when the delta cursor has expired", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({});
		fake.delta.mockRejectedValue(apiError("Gone", 410));
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState({
			deltaLinks: { inbox: "stale-delta" },
			initialSyncComplete: true,
			lastReceivedDateTime: "2026-09-10T09:00:00Z",
			deliveredMessageIds: ["m1"]
		});

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(state.initialSyncComplete).toBe(false);
		expect(state.deltaLinks).toBeUndefined();
		expect(state.syncNextLinks).toBeUndefined();
		expect(state.syncCompletedFolderIds).toBeUndefined();
		// The walk which follows delivers from where the last one reached, and the already
		// delivered identifiers survive, so the replay cannot duplicate them.
		expect(state.syncFromDateTime).toBe("2026-09-10T09:00:00Z");
		expect(state.deliveredMessageIds).toEqual(["m1"]);
	});

	test("does not redeliver already delivered mail when the walk restarts", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("Old message", "alice@example.com", "Body one."),
			m2: rawEmail("New message", "bob@example.com", "Body two.")
		});
		fake.delta.mockRejectedValueOnce(apiError("Gone", 410));
		installGraph(fake);

		// The identifier history is deliberately too short to remember m1, so the bound the walk
		// delivers from is what keeps it from being handed over a second time.
		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, maxDeliveredIdHistory: 1 }
		});
		const state: IOutlookEmailConnectorState = authenticatedState({
			deltaLinks: { inbox: "stale-delta" },
			initialSyncComplete: true,
			lastReceivedDateTime: "2026-09-10T10:00:00Z",
			deliveredMessageIds: ["m9"]
		});
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// The walk which follows the expiry sees the whole folder again.
		fake.delta.mockResolvedValue(
			deltaPage(
				[deltaMessage("m1", "2026-09-10T09:00:00Z"), deltaMessage("m2", "2026-09-10T11:00:00Z")],
				{ deltaLink: "delta-head" }
			)
		);
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["New message"]);
		expect(state.initialSyncComplete).toBe(true);
		expect(state.syncFromDateTime).toBeUndefined();
	});

	test("walks each configured folder separately during the initial sync", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("Inbox message", "alice@example.com", "Body one."),
			m2: rawEmail("Archived message", "bob@example.com", "Body two.")
		});
		fake.delta.mockImplementation(async (link: string) => {
			if (link.includes("/mailFolders/inbox/")) {
				return deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], {
					deltaLink: "inbox-delta"
				});
			}
			return deltaPage([deltaMessage("m2", "2026-09-10T10:00:00Z")], {
				deltaLink: "archive-delta"
			});
		});
		installGraph(fake);

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, folderIds: ["inbox", "archive"] }
		});
		const state: IOutlookEmailConnectorState = authenticatedState();
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// A delta cursor is per folder, so each folder needs its own call.
		expect(fake.deltaLinks()).toHaveLength(2);
		expect(retrieved.map(m => m.subject)).toEqual(["Inbox message", "Archived message"]);
		expect(state.initialSyncComplete).toBe(true);
		expect(state.deltaLinks).toEqual({ inbox: "inbox-delta", archive: "archive-delta" });
	});

	test("keeps a separate page cursor for each folder", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("First", "alice@example.com", "Body.") });
		fake.delta.mockImplementation(async (link: string) => {
			if (link.includes("/mailFolders/inbox/")) {
				return deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], {
					nextLink: "inbox-page-2"
				});
			}
			return deltaPage([], { deltaLink: "archive-delta" });
		});
		installGraph(fake);

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, folderIds: ["inbox", "archive"] }
		});
		const state: IOutlookEmailConnectorState = authenticatedState();

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		// One folder still has pages, the other is finished, so the sync is not complete.
		expect(state.syncNextLinks).toEqual({ inbox: "inbox-page-2" });
		expect(state.syncCompletedFolderIds).toEqual(["archive"]);
		expect(state.deltaLinks).toEqual({ archive: "archive-delta" });
		expect(state.initialSyncComplete).toBeUndefined();
	});

	test("pages through the delta before moving the cursor to the head", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("Page one message", "alice@example.com", "Body one."),
			m2: rawEmail("Page two message", "bob@example.com", "Body two.")
		});
		fake.delta
			.mockResolvedValueOnce(
				deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { nextLink: "delta-page-2" })
			)
			.mockResolvedValueOnce(
				deltaPage([deltaMessage("m2", "2026-09-10T10:00:00Z")], { deltaLink: "delta-head" })
			);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState({
			deltaLinks: { inbox: "stored-delta" },
			initialSyncComplete: true
		});
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// Both pages are read in the one cycle, and the cursor ends at the head.
		expect(retrieved.map(m => m.subject)).toEqual(["Page one message", "Page two message"]);
		expect(fake.deltaLinks()).toEqual(["stored-delta", "delta-page-2"]);
		expect(state.deltaLinks).toEqual({ inbox: "delta-head" });
	});

	test("walks the folders when the state has no delta cursor to resume from", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({});
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState({ initialSyncComplete: true });

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(state.initialSyncComplete).toBe(false);
		expect(fake.deltaLinks()).toHaveLength(0);
	});

	test("trims the delivered identifiers to the configured history size", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two."),
			m3: rawEmail("Third message", "carol@example.com", "Body three.")
		});
		fake.delta.mockResolvedValue(
			deltaPage(
				[
					deltaMessage("m1", "2026-09-10T09:00:00Z"),
					deltaMessage("m2", "2026-09-10T10:00:00Z"),
					deltaMessage("m3", "2026-09-10T11:00:00Z")
				],
				{ deltaLink: "delta-head" }
			)
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, maxDeliveredIdHistory: 2 }
		});
		const state: IOutlookEmailConnectorState = authenticatedState();

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(state.deliveredMessageIds).toEqual(["m2", "m3"]);
	});

	test("persists the sync progress when a poll delivers no message", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({});
		fake.delta.mockResolvedValue(deltaPage([], { nextLink: "sync-page-2" }));
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const flushed: { message: IEmail | undefined; state: IOutlookEmailConnectorState }[] = [];

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async (mailboxId, message, updatedState) => {
				flushed.push({ message, state: updatedState as IOutlookEmailConnectorState });
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(flushed).toHaveLength(1);
		expect(flushed[0].message).toBeUndefined();
		expect(flushed[0].state.syncNextLinks).toEqual({ inbox: "sync-page-2" });
	});

	test("records the refreshed token cache on the state so the owner vaults it", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state: IOutlookEmailConnectorState = authenticatedState();
		const flushed: IOutlookEmailConnectorState[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				flushed.push(updatedState as IOutlookEmailConnectorState);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// A silent acquisition leaves a new refresh token behind, so the cache which reaches the
		// caller has to be the one the identity library now holds.
		const persisted = flushed.at(-1)?.tokenCache;
		expect(persisted).toBeTypeOf("string");
		expect(Object.keys(JSON.parse(persisted ?? "{}").RefreshToken)).toHaveLength(1);
	});

	test("reports a retrieval error when the poll fails", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({});
		fake.delta.mockRejectedValue(apiError("Internal error", 500));
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const errors: (IError | undefined)[] = [];
		let authRequired = false;

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async (mailboxId, message, updatedState, retrievalError) => {
				if (retrievalError) {
					errors.push(retrievalError);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(false);
		expect(errors).toHaveLength(1);
		expect(errors[0]?.message).toBe("outlookEmailConnector.pollFailed");
	});

	test("reports a throttled poll as a retrieval error and keeps the credentials", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({});
		// Microsoft Graph reports a throttled request with its own status, so it is not mistaken
		// for a mailbox the credentials may not read.
		fake.delta.mockRejectedValue(apiError("Too Many Requests", 429));
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state = authenticatedState();
		let authRequired = false;
		let retrievalError: IError | undefined;

		await connector.retrieve(
			"test-instance",
			state,
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async (mailboxId, message, updatedState, callbackError) => {
				retrievalError = callbackError;
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		// A throttled cycle is retried on the next poll, it is not an authentication problem.
		expect(authRequired).toBe(false);
		expect(retrievalError?.message).toBe("outlookEmailConnector.pollFailed");
		expect(state.tokenCache).toBeTypeOf("string");
	});

	test("reports an auth failure with a consent URL when the refresh token is rejected", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		vi.spyOn(ConfidentialClientApplication.prototype, "acquireTokenSilent").mockRejectedValue(
			oauthError("The refresh token has expired", "invalid_grant")
		);
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		let authRequired = false;
		let authState: IEmailProtocolConnectorAuthState | undefined;
		let authError: IError | undefined;
		let reportedState: IOutlookEmailConnectorState | undefined;

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async (mailboxId, updatedState, requiresAuth, callbackAuthState, callbackError) => {
				authRequired = requiresAuth;
				authState = callbackAuthState;
				authError = callbackError;
				reportedState = updatedState as IOutlookEmailConnectorState;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		expect(authError?.message).toBe("outlookEmailConnector.pollFailed");
		expect(authState?.authUrl).toContain("login.microsoftonline.com");
		// The rejected credentials are cleared from the reported state so the owner revokes the
		// vaulted copy rather than restarting with one which no longer authenticates.
		expect(reportedState?.tokenCache).toBeUndefined();
		expect(reportedState?.accountId).toBeUndefined();
	});

	test("halts on a rejected client but keeps the credentials", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		vi.spyOn(ConfidentialClientApplication.prototype, "acquireTokenSilent").mockRejectedValue(
			oauthError("The client secret is not valid", "invalid_client")
		);
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state = authenticatedState();
		let authRequired = false;

		await connector.retrieve(
			"test-instance",
			state,
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		// The client is misconfigured rather than the token revoked, so the mailbox halts but the
		// credentials it holds are not thrown away for a problem re-consenting cannot fix.
		expect(authRequired).toBe(true);
		expect(state.tokenCache).toBeTypeOf("string");
		expect(state.accountId).toBe(TEST_ACCOUNT_ID);
	});

	test("reports an auth failure without a consent URL for application only access", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(
			ConfidentialClientApplication.prototype,
			"acquireTokenByClientCredential"
		).mockRejectedValue(apiError("Unauthorized", 401));
		installGraph(makeGraph({}));

		const connector = new OutlookEmailConnector({
			config: { ...TEST_OUTLOOK_CONFIG, appOnlyAccess: true }
		});
		let authRequired = false;
		let authState: IEmailProtocolConnectorAuthState | undefined;
		let reportedState: IOutlookEmailConnectorState | undefined;

		await connector.retrieve(
			"test-instance",
			{},
			async (mailboxId, updatedState, requiresAuth, callbackAuthState) => {
				authRequired = requiresAuth;
				authState = callbackAuthState;
				reportedState = updatedState as IOutlookEmailConnectorState;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		// There is no consent flow to point an application permission at.
		expect(authState).toBeUndefined();
		expect(reportedState?.tokenCache).toBeUndefined();
	});

	test("halts the mailbox when Microsoft Graph refuses to read it", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installAccessToken();
		const fake = makeGraph({});
		fake.delta.mockRejectedValue(apiError("Access is denied", 403));
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const state = authenticatedState();
		let authRequired = false;

		await connector.retrieve(
			"test-instance",
			state,
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired = requiresAuth;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		// The mailbox may not be read with the permissions it has, which re-consenting could fix,
		// but the credentials themselves were not rejected.
		expect(state.tokenCache).toBeTypeOf("string");
	});

	test("exchanges the authorisation code and polls on the next cycle", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installAccessToken();
		const codeExchange = installCodeExchange();
		const fake = makeGraph({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		const authRequired: boolean[] = [];
		const retrieved: IEmail[] = [];
		const authStates: (IOutlookEmailConnectorState | undefined)[] = [];
		const authCallback = async (
			mailboxId: string,
			updatedState: unknown,
			requiresAuth: boolean
		): Promise<void> => {
			authRequired.push(requiresAuth);
			authStates.push(updatedState as IOutlookEmailConnectorState | undefined);
		};
		const retrievalCallback = async (mailboxId: string, message?: IEmail): Promise<boolean> => {
			if (message) {
				retrieved.push(message);
			}
			return true;
		};

		await connector.retrieve("mailbox-abc", {}, authCallback, retrievalCallback, TEST_OPTIONS);
		await runPending();
		expect(authRequired).toEqual([true]);
		expect(retrieved).toHaveLength(0);

		await connector.completeAuth("mailbox-abc", { code: "M.C123_auth.code" }, TEST_OPTIONS);

		// The exchange has to repeat the redirect the consent URL was produced with.
		expect(codeExchange).toHaveBeenCalledWith({
			code: "M.C123_auth.code",
			scopes: ["https://graph.microsoft.com/Mail.Read"],
			redirectUri: TEST_OPTIONS.callbackUri
		});

		// The workflow continues through the auth callback, which lifts the halt and hands the
		// issued credentials over in the state so the caller can vault them.
		expect(authRequired).toEqual([true, false]);
		expect(authStates.at(-1)?.tokenCache).toBeTypeOf("string");
		expect(authStates.at(-1)?.accountId).toBe(TEST_ACCOUNT_ID);

		// The same instance now polls rather than asking for consent again.
		await runPending();
		expect(authRequired).toEqual([true, false]);
		expect(retrieved.map(m => m.subject)).toEqual(["First message"]);
	});

	test("resumes without consent when the state already carries credentials", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.delta.mockResolvedValue(
			deltaPage([deltaMessage("m1", "2026-09-10T09:00:00Z")], { deltaLink: "delta-head" })
		);
		installGraph(fake);

		// Stands in for a restart, where the vaulted token cache is restored into the state.
		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		const authRequired: boolean[] = [];
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"mailbox-abc",
			authenticatedState(),
			async (mailboxId, updatedState, requiresAuth) => {
				authRequired.push(requiresAuth);
			},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toEqual([]);
		expect(retrieved.map(m => m.subject)).toEqual(["First message"]);
	});

	test("throws when the authorisation code is missing from the payload", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		await expect(connector.completeAuth("mailbox-abc", {}, TEST_OPTIONS)).rejects.toThrow();
		await expect(connector.completeAuth("mailbox-abc", undefined, TEST_OPTIONS)).rejects.toThrow();
	});

	test("throws when the authorisation code cannot be exchanged", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		vi.spyOn(ConfidentialClientApplication.prototype, "acquireTokenByCode").mockRejectedValue(
			oauthError("The code has already been redeemed", "invalid_grant")
		);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		await connector.retrieve(
			"mailbox-abc",
			{},
			async () => {},
			async () => true,
			TEST_OPTIONS
		);

		await expect(
			connector.completeAuth("mailbox-abc", { code: "bad-code" }, TEST_OPTIONS)
		).rejects.toThrow("outlookEmailConnector.authCodeExchangeFailed");
	});

	test("throws when the consent flow issued no refresh token", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installCodeExchange({ withRefreshToken: false });

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		await connector.retrieve(
			"mailbox-abc",
			{},
			async () => {},
			async () => true,
			TEST_OPTIONS
		);

		// Without one the mailbox could not be polled after a restart, so it is a failure.
		await expect(
			connector.completeAuth("mailbox-abc", { code: "M.C123_auth.code" }, TEST_OPTIONS)
		).rejects.toThrow("outlookEmailConnector.noRefreshTokenIssued");
	});

	test("refuses the exchange when no flow has been started", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const codeExchange = installCodeExchange();

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		// The authorisation code can only be spent once, so a connector with nowhere to report
		// the issued credentials has to refuse before it exchanges the code.
		await expect(
			connector.completeAuth("mailbox-abc", { code: "M.C123_auth.code" }, TEST_OPTIONS)
		).rejects.toThrow("outlookEmailConnector.authFlowNotStarted");

		expect(codeExchange).not.toHaveBeenCalled();
	});

	test("rejects consent given by an account other than the mailbox", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installConsentUrl();
		installCodeExchange({ accountId: "other.utid", username: "someone-else@example.com" });

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });

		const reported: unknown[] = [];
		await connector.retrieve(
			"mailbox-abc",
			{},
			async (mailboxId, updatedState) => {
				reported.push(updatedState);
			},
			async () => true,
			TEST_OPTIONS
		);

		// The state travels through the browser, so consent can come back from another account.
		// Binding the mailbox to it would ingest somebody else's email.
		await expect(
			connector.completeAuth("mailbox-abc", { code: "M.C123_auth.code" }, TEST_OPTIONS)
		).rejects.toThrow("outlookEmailConnector.consentAccountMismatch");

		expect(reported).toEqual([]);
	});

	test("stops delivering when retrieveStop is called mid-poll", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGraph({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		fake.delta.mockResolvedValue(
			deltaPage(
				[deltaMessage("m1", "2026-09-10T09:00:00Z"), deltaMessage("m2", "2026-09-10T10:00:00Z")],
				{ deltaLink: "delta-head" }
			)
		);
		installGraph(fake);

		const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					retrieved.push(message);
				}
				await connector.retrieveStop();
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(retrieved).toHaveLength(1);
	});
});

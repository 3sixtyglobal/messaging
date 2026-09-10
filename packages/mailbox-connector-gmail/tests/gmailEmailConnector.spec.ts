// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@twin.org/background-task-models";
import { ComponentFactory, Converter } from "@twin.org/core";
import type { IError } from "@twin.org/core";
import {
	EmailProtocolConnectorFactory,
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory,
	type IEmail,
	type IEmailProtocolConnectorAuthState,
	type IEmailProtocolConnectorOptions
} from "@twin.org/mailbox-models";
import { google, type gmail_v1 as GmailApi } from "googleapis";
import { TEST_GMAIL_CONFIG } from "./setupTestEnv.js";
import { GmailEmailConnectorConfigSchema } from "../src/connectorSchema/gmailEmailConnectorConfigSchema.js";
import { GmailEmailConnectorStateSchema } from "../src/connectorSchema/gmailEmailConnectorStateSchema.js";
import { GmailEmailConnector } from "../src/gmailEmailConnector.js";
import type { IGmailEmailConnectorState } from "../src/models/IGmailEmailConnectorState.js";

const CLIENT_EMAIL_KEY = "client_email";
const PRIVATE_KEY_KEY = "private_key";
const REFRESH_TOKEN_KEY = "refresh_token";
const ACCESS_TOKEN_KEY = "access_token";
const REDIRECT_URI_KEY = "redirect_uri";

// The owning component supplies a single fixed callback URI for the whole deployment, along
// with the state which correlates a consent response back to the mailbox and its partition.
const TEST_OPTIONS: IEmailProtocolConnectorOptions = {
	callbackUri: "https://app.example.com/mailbox/authcallback",
	correlationState: "test-tenant/mailbox-abc"
};

// The refresh token is issued by the consent flow rather than configured, so a mailbox which
// has already given consent is polled with the token carried in its state.
function authenticatedState(state?: IGmailEmailConnectorState): IGmailEmailConnectorState {
	return { refreshToken: "test-refresh-token", ...state };
}

const TEST_SERVICE_ACCOUNT_KEY = JSON.stringify({
	[CLIENT_EMAIL_KEY]: "ingest@test-project.iam.gserviceaccount.com",
	[PRIVATE_KEY_KEY]: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n"
});

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
	return Converter.bytesToBase64Url(
		Converter.utf8ToBytes(
			[
				`From: ${from}`,
				"To: recipient@example.com",
				`Subject: ${subject}`,
				"MIME-Version: 1.0",
				"Content-Type: text/plain",
				"",
				body
			].join("\r\n")
		)
	);
}

interface IFakeGmail {
	client: GmailApi.Gmail;
	getProfile: ReturnType<typeof vi.fn>;
	messagesList: ReturnType<typeof vi.fn>;
	messagesGet: ReturnType<typeof vi.fn>;
	historyList: ReturnType<typeof vi.fn>;
}

function historyAdded(
	messageId: string,
	labelIds: string[] = ["INBOX"]
): { message: { id: string; labelIds: string[] } } {
	return { message: { id: messageId, labelIds } };
}

function makeGmail(
	raws: { [messageId: string]: string },
	emailAddress: string = "ingest@example.com"
): IFakeGmail {
	const getProfile = vi.fn(async () => ({ data: { historyId: "2000", emailAddress } }));
	const messagesList = vi.fn(async () => ({ data: {} }));
	const messagesGet = vi.fn(async (params: { id: string }) => ({
		data: { id: params.id, labelIds: ["INBOX"], raw: raws[params.id] }
	}));
	const historyList = vi.fn(async () => ({ data: { historyId: "2000" } }));

	const client = {
		users: {
			getProfile,
			messages: { list: messagesList, get: messagesGet },
			history: { list: historyList }
		}
	} as unknown as GmailApi.Gmail;

	return { client, getProfile, messagesList, messagesGet, historyList };
}

function installGmail(fake: IFakeGmail): void {
	vi.spyOn(google, "gmail").mockReturnValue(fake.client);
}

interface IOAuthPrototype {
	getAccessToken: () => Promise<{ token?: string }>;
	getToken: (options: {
		[propertyKey: string]: unknown;
		code: string;
	}) => Promise<{ tokens: { [propertyKey: string]: unknown } }>;
}

// getAccessToken and getToken are overloaded with callback forms, so narrow the prototype to the
// promise forms the connector uses before spying on them.
function oauthPrototype(): IOAuthPrototype {
	return google.auth.OAuth2.prototype as unknown as IOAuthPrototype;
}

function installAccessToken(): void {
	vi.spyOn(oauthPrototype(), "getAccessToken").mockResolvedValue({ token: "test-access-token" });
}

function apiError(message: string, status: number): Error {
	return Object.assign(new Error(message), { response: { status } });
}

describe("GmailEmailConnector", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);
	});

	test("can register in the factory", () => {
		EmailProtocolConnectorFactory.register(
			GmailEmailConnector.NAMESPACE,
			config => new GmailEmailConnector({ config: config as typeof TEST_GMAIL_CONFIG })
		);
		const connector = EmailProtocolConnectorFactory.create(
			GmailEmailConnector.NAMESPACE,
			TEST_GMAIL_CONFIG
		);
		expect(connector).toBeDefined();
		expect(connector.className()).toBe("GmailEmailConnector");
	});

	test("NAMESPACE is gmail", () => {
		expect(GmailEmailConnector.NAMESPACE).toBe("gmail");
	});

	test("GmailEmailConnectorConfigSchema declares isSecure on the credential fields", () => {
		const secureFields = GmailEmailConnectorConfigSchema.filter(f => f.isSecure).map(
			f => f.propertyKey
		);
		expect(secureFields).toEqual(["clientSecret", "serviceAccountKey"]);
	});

	test("GmailEmailConnectorConfigSchema declares the required OAuth fields", () => {
		const propertyKeys = GmailEmailConnectorConfigSchema.map(f => f.propertyKey);
		expect(propertyKeys).toContain("emailAddress");
		expect(propertyKeys).toContain("clientId");
		expect(propertyKeys).toContain("clientSecret");
		// The refresh token is issued by the consent flow, so it belongs to the state schema.
		expect(propertyKeys).not.toContain("refreshToken");
	});

	test("GmailEmailConnectorStateSchema describes every state property", () => {
		// The schema is what the owning component persists the state through, so a property
		// missing from it is a property the component cannot classify.
		expect(GmailEmailConnectorStateSchema.map(f => f.propertyKey)).toEqual([
			"refreshToken",
			"historyId",
			"syncPageTokens",
			"syncCompletedLabelIds",
			"initialSyncComplete",
			"deliveredMessageIds"
		]);
	});

	test("GmailEmailConnectorStateSchema marks only the refresh token as secure", () => {
		expect(GmailEmailConnectorStateSchema.filter(f => f.isSecure)).toEqual([
			{
				labelKey: "gmailEmailConnectorStateSchema.refreshToken",
				propertyKey: "refreshToken",
				type: "string",
				isSecure: true
			}
		]);
	});

	test("GmailEmailConnectorStateSchema types the collection properties", () => {
		const byKey = Object.fromEntries(GmailEmailConnectorStateSchema.map(f => [f.propertyKey, f]));

		expect(byKey.syncPageTokens.type).toBe("object");
		expect(byKey.initialSyncComplete.type).toBe("boolean");
		expect(byKey.syncCompletedLabelIds).toMatchObject({ type: "array", itemType: "string" });
		expect(byKey.deliveredMessageIds).toMatchObject({ type: "array", itemType: "string" });
	});

	test("GmailEmailConnectorStateSchema can be registered in the state schema factory", () => {
		EmailProtocolConnectorStateSchemaFactory.register(
			GmailEmailConnector.NAMESPACE,
			() => GmailEmailConnectorStateSchema
		);

		expect(EmailProtocolConnectorStateSchemaFactory.get(GmailEmailConnector.NAMESPACE)).toEqual(
			GmailEmailConnectorStateSchema
		);
	});

	test("GmailEmailConnectorConfigSchema can be registered in schema factory", () => {
		EmailProtocolConnectorConfigSchemaFactory.register(
			GmailEmailConnector.NAMESPACE,
			() => GmailEmailConnectorConfigSchema
		);
		const schema = EmailProtocolConnectorConfigSchemaFactory.get(GmailEmailConnector.NAMESPACE);
		expect(schema).toHaveLength(GmailEmailConnectorConfigSchema.length);
	});

	test("throws when the email address is missing", () => {
		expect(
			() => new GmailEmailConnector({ config: { ...TEST_GMAIL_CONFIG, emailAddress: "" } })
		).toThrow();
	});

	test("throws when neither an OAuth client nor a service account key are supplied", () => {
		expect(() => new GmailEmailConnector({ config: { emailAddress: "test@example.com" } })).toThrow(
			"gmailEmailConnector.missingOAuthCredentials"
		);
	});

	test("throws when the OAuth client secret is missing", () => {
		expect(
			() =>
				new GmailEmailConnector({
					config: { emailAddress: "test@example.com", clientId: "test-client-id" }
				})
		).toThrow("gmailEmailConnector.missingOAuthCredentials");
	});

	test("accepts an OAuth client with no refresh token so consent can be requested", () => {
		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "test@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});
		expect(connector.className()).toBe("GmailEmailConnector");
	});

	test("GmailEmailConnectorConfigSchema defaults the labels to the inbox", () => {
		const labelField = GmailEmailConnectorConfigSchema.find(f => f.propertyKey === "labelIds");
		expect(labelField).toBeDefined();
		expect(labelField?.defaultValue).toEqual(["INBOX"]);
	});

	test("GmailEmailConnectorConfigSchema does not expose the callback URI", () => {
		// The callback URI is fixed for the deployment and supplied by the mailbox service, so it
		// must never be presented as a per-mailbox field.
		const propertyKeys = GmailEmailConnectorConfigSchema.map(f => f.propertyKey);
		expect(propertyKeys).not.toContain("redirectUri");
		expect(propertyKeys).not.toContain("callbackUri");
	});

	test("throws when the service account key is not a valid key", () => {
		expect(
			() =>
				new GmailEmailConnector({
					config: { emailAddress: "test@example.com", serviceAccountKey: "not-json" }
				})
		).toThrow("gmailEmailConnector.invalidServiceAccountKey");
	});

	test("accepts a service account key without OAuth credentials", () => {
		const connector = new GmailEmailConnector({
			config: { emailAddress: "test@example.com", serviceAccountKey: TEST_SERVICE_ACCOUNT_KEY }
		});
		expect(connector.className()).toBe("GmailEmailConnector");
	});

	test("retrieveStop does not throw when not started", async () => {
		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		await expect(connector.retrieveStop()).resolves.not.toThrow();
	});
});

describe("GmailEmailConnector monitoring", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test("requests consent through the auth callback when there is no refresh token", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

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
		expect(authState?.authUrl).toContain("accounts.google.com");
		expect(authState?.authUrl).toContain("access_type=offline");
		// The Gmail API must not be called at all while consent is outstanding.
		expect(fake.messagesList).not.toHaveBeenCalled();
		expect(fake.getProfile).not.toHaveBeenCalled();
		expect(retrievals).toHaveLength(0);
	});

	test("carries the correlation state and address through the consent URL", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		installGmail(makeGmail({}));

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

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
		expect(params.get("scope")).toBe("https://www.googleapis.com/auth/gmail.readonly");
	});

	test("initiateAuth produces a consent URL before the mailbox has ever been polled", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

		const authState = await connector.initiateAuth("mailbox-abc", {}, TEST_OPTIONS);

		const params = new URL(authState?.authUrl ?? "").searchParams;
		expect(params.get("state")).toBe(TEST_OPTIONS.correlationState);
		expect(params.get("redirect_uri")).toBe(TEST_OPTIONS.callbackUri);
		expect(params.get("login_hint")).toBe("ingest@example.com");
		expect(params.get("access_type")).toBe("offline");
	});

	test("initiateAuth asks for nothing when the state already carries a refresh token", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });

		await expect(
			connector.initiateAuth("mailbox-abc", authenticatedState(), TEST_OPTIONS)
		).resolves.toBeUndefined();
	});

	test("initiateAuth asks for nothing when a service account key is configured", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				serviceAccountKey: TEST_SERVICE_ACCOUNT_KEY
			}
		});

		await expect(connector.initiateAuth("mailbox-abc", {}, TEST_OPTIONS)).resolves.toBeUndefined();
	});

	test("polls normally once the consent flow has supplied a refresh token", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		installGmail(fake);

		// Stands in for the mailbox being updated with the refresh token from the consent
		// redirect, which restarts the connector with the token restored into its state.
		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

		let authRequired = false;
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"mailbox-abc",
			authenticatedState({ refreshToken: "issued-refresh-token" }),
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

		installAccessToken();
		const fake = makeGmail({});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

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
		expect(fake.messagesList).not.toHaveBeenCalled();
	});

	test("polls without a callback URI and reports auth with no consent URL", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
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

	test("does not request consent when a service account key is configured", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("Delegated", "alice@example.com", "Body.") });
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				serviceAccountKey: TEST_SERVICE_ACCOUNT_KEY
			}
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

		expect(authRequired).toBe(false);
		expect(retrieved.map(m => m.subject)).toEqual(["Delegated"]);
	});

	test("refreshes the access token before calling the Gmail API", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const accessToken = vi
			.spyOn(oauthPrototype(), "getAccessToken")
			.mockResolvedValue({ token: "test-access-token" });
		installGmail(makeGmail({}));

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(accessToken).toHaveBeenCalled();
	});

	test("delivers the existing messages oldest first and records the mailbox history id", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		// The Gmail API returns the newest message first.
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m2" }, { id: "m1" }] } });
		fake.getProfile.mockResolvedValue({ data: { historyId: "2000" } });
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState();
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
		expect(retrieved[0].flags).toEqual(["INBOX"]);
		expect(state.historyId).toBe("2000");
		expect(state.initialSyncComplete).toBe(true);
		expect(state.deliveredMessageIds).toEqual(["m1", "m2"]);
	});

	test("keeps the page token when more of the mailbox remains to be walked", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.messagesList.mockResolvedValue({
			data: { messages: [{ id: "m1" }], nextPageToken: "page-2" }
		});
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState();

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(state.syncPageTokens).toEqual({ INBOX: "page-2" });
		expect(state.initialSyncComplete).toBeUndefined();
	});

	test("delivers new messages from the history and never delivers one twice", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		fake.getProfile.mockResolvedValue({ data: { historyId: "2000" } });
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState();
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

		// The history boundary repeats the record the cursor sits on, so m1 comes back as well.
		fake.historyList.mockResolvedValue({
			data: {
				historyId: "2100",
				history: [
					{ id: "2000", messagesAdded: [historyAdded("m1")] },
					{ id: "2050", messagesAdded: [historyAdded("m2")] }
				]
			}
		});
		await runPending();

		expect(retrieved.map(m => m.subject)).toEqual(["First message", "Second message"]);
		expect(state.historyId).toBe("2100");
		expect(fake.messagesGet.mock.calls.filter(call => call[0].id === "m1")).toHaveLength(1);

		// A third poll with no further history must deliver nothing.
		fake.historyList.mockResolvedValue({ data: { historyId: "2100" } });
		await runPending();
		expect(retrieved.map(m => m.subject)).toEqual(["First message", "Second message"]);
	});

	test("redelivers a message whose persist failed on the next poll", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("Persisted message", "alice@example.com", "Body one."),
			m2: rawEmail("Failed message", "bob@example.com", "Body two.")
		});
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m2" }, { id: "m1" }] } });
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState();

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

	test("restarts the mailbox sync when the stored history id has expired", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({});
		fake.historyList.mockRejectedValue(apiError("Not Found", 404));
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState({
			historyId: "1000",
			initialSyncComplete: true,
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
		expect(state.historyId).toBeUndefined();
		expect(state.syncPageTokens).toBeUndefined();
		expect(state.syncCompletedLabelIds).toBeUndefined();
		// The already delivered identifiers survive, so the replay cannot duplicate them.
		expect(state.deliveredMessageIds).toEqual(["m1"]);
	});

	test("reports a retrieval error when the poll fails", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({});
		fake.messagesList.mockRejectedValue(apiError("Internal error", 500));
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
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
		expect(errors[0]?.message).toBe("gmailEmailConnector.pollFailed");
	});

	test("reports an auth failure with a consent URL when the refresh token is rejected", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(oauthPrototype(), "getAccessToken").mockRejectedValue(
			Object.assign(new Error("invalid_grant"), {
				response: { data: { error: "invalid_grant" } }
			})
		);
		installGmail(makeGmail({}));

		const connector = new GmailEmailConnector({
			config: TEST_GMAIL_CONFIG
		});
		let authRequired = false;
		let authState: IEmailProtocolConnectorAuthState | undefined;
		let authError: IError | undefined;
		let reportedState: IGmailEmailConnectorState | undefined;

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async (mailboxId, updatedState, requiresAuth, callbackAuthState, callbackError) => {
				authRequired = requiresAuth;
				authState = callbackAuthState;
				authError = callbackError;
				reportedState = updatedState as IGmailEmailConnectorState;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		expect(authError?.message).toBe("gmailEmailConnector.pollFailed");
		expect(authState?.authUrl).toContain("accounts.google.com");
		expect(authState?.authUrl).toContain("access_type=offline");
		// The rejected token is cleared from the reported state so the owner revokes the vaulted
		// copy rather than restarting with a credential which no longer authenticates.
		expect(reportedState?.refreshToken).toBeUndefined();
	});

	test("reports a throttled poll as a retrieval error and keeps the refresh token", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		// Gmail shares the 403 status between a mailbox the credentials may not read and a poll
		// which exceeded a quota, so the reason is what separates them.
		vi.spyOn(oauthPrototype(), "getAccessToken").mockResolvedValue({ token: "test-access-token" });
		const fake = makeGmail({});
		fake.messagesList.mockRejectedValue(
			Object.assign(new Error("Rate Limit Exceeded"), {
				response: {
					status: 403,
					data: { error: { errors: [{ reason: "rateLimitExceeded" }] } }
				}
			})
		);
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
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
		expect(retrievalError?.message).toBe("gmailEmailConnector.pollFailed");
		expect(state.refreshToken).toBe("test-refresh-token");
	});

	test("halts on a rejected OAuth client but keeps the refresh token", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(oauthPrototype(), "getAccessToken").mockRejectedValue(
			Object.assign(new Error("invalid_client"), {
				response: { data: { error: "invalid_client" } }
			})
		);
		installGmail(makeGmail({}));

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
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
		// credential it holds is not thrown away for a problem re-consenting cannot fix.
		expect(authRequired).toBe(true);
		expect(state.refreshToken).toBe("test-refresh-token");
	});

	test("reports an auth failure without a consent URL for a service account", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(oauthPrototype(), "getAccessToken").mockRejectedValue(apiError("Unauthorized", 401));
		installGmail(makeGmail({}));

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				serviceAccountKey: TEST_SERVICE_ACCOUNT_KEY
			}
		});
		let authRequired = false;
		let authState: IEmailProtocolConnectorAuthState | undefined;
		let reportedState: IGmailEmailConnectorState | undefined;

		await connector.retrieve(
			"test-instance",
			{},
			async (mailboxId, updatedState, requiresAuth, callbackAuthState) => {
				authRequired = requiresAuth;
				authState = callbackAuthState;
				reportedState = updatedState as IGmailEmailConnectorState;
			},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		expect(authRequired).toBe(true);
		// There is no consent flow to point a service account at.
		expect(authState).toBeUndefined();
		// A service account holds no refresh token, so there is nothing to revoke.
		expect(reportedState?.refreshToken).toBeUndefined();
	});

	test("monitors the mailbox using a service account key", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("Delegated message", "alice@example.com", "Body.") });
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				serviceAccountKey: TEST_SERVICE_ACCOUNT_KEY
			}
		});
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			{},
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

		expect(retrieved.map(m => m.subject)).toEqual(["Delegated message"]);
		expect(fake.messagesList.mock.calls[0][0].userId).toBe("ingest@example.com");
	});

	test("reads the mailbox history unfiltered so any configured label can match", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: { ...TEST_GMAIL_CONFIG, labelIds: ["INBOX", "Label_12"] }
		});

		await connector.retrieve(
			"test-instance",
			authenticatedState({ historyId: "2000", initialSyncComplete: true }),
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		// The history API only accepts one label, so it is not narrowed at all.
		expect(fake.historyList.mock.calls[0][0].labelId).toBeUndefined();
		expect(fake.historyList.mock.calls[0][0].startHistoryId).toBe("2000");
		expect(fake.historyList.mock.calls[0][0].historyTypes).toEqual(["messageAdded"]);
	});

	test("lists each configured label separately during the initial sync", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("Inbox message", "alice@example.com", "Body one."),
			m2: rawEmail("Labelled message", "bob@example.com", "Body two.")
		});
		fake.messagesList.mockImplementation(async (params: { labelIds: string[] }) => {
			if (params.labelIds[0] === "INBOX") {
				return { data: { messages: [{ id: "m1" }] } };
			}
			return { data: { messages: [{ id: "m2" }] } };
		});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: { ...TEST_GMAIL_CONFIG, labelIds: ["INBOX", "Label_12"] }
		});
		const state: IGmailEmailConnectorState = authenticatedState();
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

		// Gmail ands the labels given to one list call, so each label needs its own.
		expect(fake.messagesList.mock.calls.map(call => call[0].labelIds)).toEqual([
			["INBOX"],
			["Label_12"]
		]);
		expect(retrieved.map(m => m.subject)).toEqual(["Inbox message", "Labelled message"]);
		expect(state.initialSyncComplete).toBe(true);
	});

	test("keeps a separate page cursor for each label", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("First", "alice@example.com", "Body.") });
		fake.messagesList.mockImplementation(async (params: { labelIds: string[] }) => {
			if (params.labelIds[0] === "INBOX") {
				return { data: { messages: [{ id: "m1" }], nextPageToken: "inbox-page-2" } };
			}
			return { data: { messages: [] } };
		});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: { ...TEST_GMAIL_CONFIG, labelIds: ["INBOX", "Label_12"] }
		});
		const state: IGmailEmailConnectorState = authenticatedState();

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async () => true,
			TEST_OPTIONS
		);
		await runPending();

		// One label still has pages, the other is finished, so the sync is not complete.
		expect(state.syncPageTokens).toEqual({ INBOX: "inbox-page-2" });
		expect(state.syncCompletedLabelIds).toEqual(["Label_12"]);
		expect(state.initialSyncComplete).toBeUndefined();
	});

	test("delivers a history message carrying any configured label", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("Labelled message", "alice@example.com", "Body one."),
			m2: rawEmail("Unrelated message", "bob@example.com", "Body two.")
		});
		fake.historyList.mockResolvedValue({
			data: {
				historyId: "2100",
				history: [
					{ id: "2010", messagesAdded: [historyAdded("m1", ["Label_12", "UNREAD"])] },
					{ id: "2020", messagesAdded: [historyAdded("m2", ["SENT"])] }
				]
			}
		});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: { ...TEST_GMAIL_CONFIG, labelIds: ["INBOX", "Label_12"] }
		});
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			authenticatedState({ historyId: "2000", initialSyncComplete: true }),
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

		// Only the message carrying a configured label is delivered.
		expect(retrieved.map(m => m.subject)).toEqual(["Labelled message"]);
	});

	test("pages through the history before moving to the mailbox head", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("Page one message", "alice@example.com", "Body one."),
			m2: rawEmail("Page two message", "bob@example.com", "Body two.")
		});
		fake.historyList
			.mockResolvedValueOnce({
				data: {
					historyId: "2100",
					nextPageToken: "history-page-2",
					history: [{ id: "2010", messagesAdded: [historyAdded("m1")] }]
				}
			})
			.mockResolvedValueOnce({
				data: {
					historyId: "2100",
					history: [{ id: "2020", messagesAdded: [historyAdded("m2")] }]
				}
			});
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState({
			historyId: "2000",
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

		expect(retrieved.map(m => m.subject)).toEqual(["Page one message", "Page two message"]);
		expect(state.historyId).toBe("2100");
		// Every page must ask from the same starting point, not from the advancing cursor.
		expect(fake.historyList.mock.calls[1][0].startHistoryId).toBe("2000");
		expect(fake.historyList.mock.calls[1][0].pageToken).toBe("history-page-2");
	});

	test("trims the delivered identifiers to the configured history size", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two."),
			m3: rawEmail("Third message", "carol@example.com", "Body three.")
		});
		fake.messagesList.mockResolvedValue({
			data: { messages: [{ id: "m3" }, { id: "m2" }, { id: "m1" }] }
		});
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: { ...TEST_GMAIL_CONFIG, maxDeliveredIdHistory: 2 }
		});
		const state: IGmailEmailConnectorState = authenticatedState();

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
		const fake = makeGmail({});
		fake.messagesList.mockResolvedValue({ data: { messages: [], nextPageToken: "page-2" } });
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const flushed: { message: IEmail | undefined; state: IGmailEmailConnectorState }[] = [];

		await connector.retrieve(
			"test-instance",
			authenticatedState(),
			async () => {},
			async (mailboxId, message, updatedState) => {
				flushed.push({ message, state: updatedState as IGmailEmailConnectorState });
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(flushed).toHaveLength(1);
		expect(flushed[0].message).toBeUndefined();
		expect(flushed[0].state.syncPageTokens).toEqual({ INBOX: "page-2" });
		expect(flushed[0].state.historyId).toBe("2000");
	});

	test("advances the history cursor per record so a failure replays only what remains", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		fake.historyList.mockResolvedValue({
			data: {
				historyId: "2200",
				history: [
					{ id: "2010", messagesAdded: [historyAdded("m1")] },
					{ id: "2020", messagesAdded: [historyAdded("m2")] }
				]
			}
		});
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		const state: IGmailEmailConnectorState = authenticatedState({
			historyId: "2000",
			initialSyncComplete: true
		});
		const delivered: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				if (message) {
					delivered.push(message);
				}
				return delivered.length < 2;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(delivered.map(m => m.subject)).toEqual(["First message", "Second message"]);
		// The first record completed, the second did not, so only the first may be checked off.
		expect(state.historyId).toBe("2010");
		expect(state.deliveredMessageIds).toEqual(["m1"]);
	});

	test("exchanges the authorisation code and polls on the next cycle", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const getToken = vi
			.spyOn(oauthPrototype(), "getToken")
			.mockResolvedValue({ tokens: { [REFRESH_TOKEN_KEY]: "issued-refresh-token" } });
		const fake = makeGmail({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		installGmail(fake);

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

		const authRequired: boolean[] = [];
		const retrieved: IEmail[] = [];
		const authStates: (IGmailEmailConnectorState | undefined)[] = [];
		const authCallback = async (
			mailboxId: string,
			updatedState: unknown,
			requiresAuth: boolean
		): Promise<void> => {
			authRequired.push(requiresAuth);
			authStates.push(updatedState as IGmailEmailConnectorState | undefined);
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

		await connector.completeAuth("mailbox-abc", { code: "4/0AeaYSHDauthcode" }, TEST_OPTIONS);

		// The exchange has to repeat the redirect the consent URL was produced with.
		expect(getToken).toHaveBeenCalledWith({
			code: "4/0AeaYSHDauthcode",
			[REDIRECT_URI_KEY]: TEST_OPTIONS.callbackUri
		});

		// The workflow continues through the auth callback, which lifts the halt and hands the
		// issued token over in the state so the caller can vault it.
		expect(authRequired).toEqual([true, false]);
		expect(authStates.at(-1)?.refreshToken).toBe("issued-refresh-token");

		// The same instance now polls rather than asking for consent again.
		await runPending();
		expect(authRequired).toEqual([true, false]);
		expect(retrieved.map(m => m.subject)).toEqual(["First message"]);
	});

	test("resumes without consent when the state already carries a refresh token", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({ m1: rawEmail("First message", "alice@example.com", "Body one.") });
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m1" }] } });
		installGmail(fake);

		// Stands in for a restart, where the vaulted token is restored into the state.
		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

		const authRequired: boolean[] = [];
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"mailbox-abc",
			authenticatedState({ refreshToken: "persisted-refresh-token" }),
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

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });

		await expect(connector.completeAuth("mailbox-abc", {}, TEST_OPTIONS)).rejects.toThrow();
		await expect(connector.completeAuth("mailbox-abc", undefined, TEST_OPTIONS)).rejects.toThrow();
	});

	test("throws when the authorisation code cannot be exchanged", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(oauthPrototype(), "getToken").mockRejectedValue(apiError("invalid_grant", 400));

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		await connector.retrieve(
			"mailbox-abc",
			{},
			async () => {},
			async () => true,
			TEST_OPTIONS
		);

		await expect(
			connector.completeAuth("mailbox-abc", { code: "bad-code" }, TEST_OPTIONS)
		).rejects.toThrow("gmailEmailConnector.authCodeExchangeFailed");
	});

	test("throws when Google issues no refresh token", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(oauthPrototype(), "getToken").mockResolvedValue({
			tokens: { [ACCESS_TOKEN_KEY]: "only-an-access-token" }
		});

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
		await connector.retrieve(
			"mailbox-abc",
			{},
			async () => {},
			async () => true,
			TEST_OPTIONS
		);

		// Without one the mailbox could not be polled after a restart, so it is a failure.
		await expect(
			connector.completeAuth("mailbox-abc", { code: "4/0AeaYSHDauthcode" }, TEST_OPTIONS)
		).rejects.toThrow("gmailEmailConnector.noRefreshTokenIssued");
	});

	test("refuses the exchange when no flow has been started", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const getToken = vi
			.spyOn(oauthPrototype(), "getToken")
			.mockResolvedValue({ tokens: { [REFRESH_TOKEN_KEY]: "issued-refresh-token" } });

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });

		// The authorisation code can only be spent once, so a connector with nowhere to report
		// the issued token has to refuse before it exchanges the code.
		await expect(
			connector.completeAuth("mailbox-abc", { code: "4/0AeaYSHDauthcode" }, TEST_OPTIONS)
		).rejects.toThrow("gmailEmailConnector.authFlowNotStarted");

		expect(getToken).not.toHaveBeenCalled();
	});

	test("rejects consent given by an account other than the mailbox", async () => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		vi.spyOn(oauthPrototype(), "getToken").mockResolvedValue({
			tokens: { [REFRESH_TOKEN_KEY]: "issued-refresh-token" }
		});
		installGmail(makeGmail({}, "someone-else@example.com"));

		const connector = new GmailEmailConnector({
			config: {
				emailAddress: "ingest@example.com",
				clientId: "test-client-id",
				clientSecret: "test-client-secret"
			}
		});

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
			connector.completeAuth("mailbox-abc", { code: "4/0AeaYSHDauthcode" }, TEST_OPTIONS)
		).rejects.toThrow("gmailEmailConnector.consentAccountMismatch");

		expect(reported).toEqual([]);
	});

	test("stops delivering when retrieveStop is called mid-poll", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		installAccessToken();
		const fake = makeGmail({
			m1: rawEmail("First message", "alice@example.com", "Body one."),
			m2: rawEmail("Second message", "bob@example.com", "Body two.")
		});
		fake.messagesList.mockResolvedValue({ data: { messages: [{ id: "m2" }, { id: "m1" }] } });
		installGmail(fake);

		const connector = new GmailEmailConnector({ config: TEST_GMAIL_CONFIG });
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

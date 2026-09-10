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
	type IEmailProtocolConnectorOptions
} from "@twin.org/mailbox-models";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import {
	TEST_IMAP_CONFIG,
	TEST_IMAP_HOST,
	TEST_IMAP_HTTP_PORT,
	TEST_IMAP_SMTP_PORT
} from "./setupTestEnv.js";
import { ImapEmailConnectorConfigSchema } from "../src/connectorSchema/imapEmailConnectorConfigSchema.js";
import { ImapEmailConnectorStateSchema } from "../src/connectorSchema/imapEmailConnectorStateSchema.js";
import { ImapEmailConnector } from "../src/imapEmailConnector.js";

const MINIMAL_RAW_EMAIL = [
	"From: sender@example.com",
	"To: recipient@example.com",
	"Subject: Test",
	"MIME-Version: 1.0",
	"Content-Type: text/plain",
	"",
	"Test body."
].join("\r\n");

// These protocols authenticate with their stored credentials, so the callback URI and the
// correlation state are only supplied to satisfy the contract.
const TEST_OPTIONS: IEmailProtocolConnectorOptions = {
	callbackUri: "https://app.example.com/mailbox/authcallback",
	correlationState: "test-tenant/test-mailbox"
};

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

interface IMessageStream extends AsyncIterableIterator<{
	seq: number;
	uid: number;
	source: Buffer;
	flags: Set<string>;
}> {
	/**
	 * Whether the consumer terminated the stream early via return().
	 */
	terminated: boolean;
}

function makeMessageStream(count: number, throwAtIndex?: number): IMessageStream {
	interface Msg {
		seq: number;
		uid: number;
		source: Buffer;
		flags: Set<string>;
	}
	let i = 0;
	const stream: IMessageStream = {
		terminated: false,
		async next(): Promise<IteratorResult<Msg>> {
			if (throwAtIndex !== undefined && i === throwAtIndex) {
				throw new Error("Connection lost");
			}
			if (i >= count) {
				return { done: true, value: undefined };
			}
			const value: Msg = {
				seq: i + 1,
				uid: i + 1,
				source: Buffer.from(MINIMAL_RAW_EMAIL),
				flags: new Set<string>(["\\Seen"])
			};
			i++;
			return { done: false, value };
		},
		async return(): Promise<IteratorResult<Msg>> {
			stream.terminated = true;
			i = count;
			return { done: true, value: undefined };
		},
		[Symbol.asyncIterator]() {
			return stream;
		}
	};
	return stream;
}

async function resetGreenMail(): Promise<void> {
	await fetch(`http://${TEST_IMAP_HOST}:${TEST_IMAP_HTTP_PORT}/api/service/reset`, {
		method: "POST"
	});
	await fetch(`http://${TEST_IMAP_HOST}:${TEST_IMAP_HTTP_PORT}/api/user`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: `${TEST_IMAP_CONFIG.username}@localhost`,
			login: TEST_IMAP_CONFIG.username,
			password: TEST_IMAP_CONFIG.password
		})
	});
}

async function sendTestEmail(
	from: string,
	to: string,
	subject: string,
	text: string,
	cc?: string
): Promise<void> {
	const transporter = nodemailer.createTransport({
		host: TEST_IMAP_HOST,
		port: TEST_IMAP_SMTP_PORT,
		secure: false
	});
	await transporter.sendMail({
		envelope: { from: "test@localhost", to: "test@localhost" },
		from,
		to,
		cc,
		subject,
		text
	});
}

describe("ImapEmailConnector", () => {
	beforeEach(() => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);
	});

	test("can register in the factory", () => {
		EmailProtocolConnectorFactory.register(
			ImapEmailConnector.NAMESPACE,
			config => new ImapEmailConnector({ config: config as typeof TEST_IMAP_CONFIG })
		);
		const connector = EmailProtocolConnectorFactory.create(
			ImapEmailConnector.NAMESPACE,
			TEST_IMAP_CONFIG
		);
		expect(connector).toBeDefined();
		expect(connector.className()).toBe("ImapEmailConnector");
	});

	test("NAMESPACE is imap", () => {
		expect(ImapEmailConnector.NAMESPACE).toBe("imap");
	});

	test("ImapEmailConnectorConfigSchema declares isSecure on password field", () => {
		const passwordField = ImapEmailConnectorConfigSchema.find(f => f.propertyKey === "password");
		expect(passwordField).toBeDefined();
		expect(passwordField?.isSecure).toBe(true);
	});

	test("ImapEmailConnectorConfigSchema can be registered in schema factory", () => {
		EmailProtocolConnectorConfigSchemaFactory.register(
			ImapEmailConnector.NAMESPACE,
			() => ImapEmailConnectorConfigSchema
		);
		const schema = EmailProtocolConnectorConfigSchemaFactory.get(ImapEmailConnector.NAMESPACE);
		expect(schema).toHaveLength(ImapEmailConnectorConfigSchema.length);
	});

	test("ImapEmailConnectorStateSchema describes every state property", () => {
		// The schema is what the owning component persists the state through, so a property
		// missing from it is a property the component cannot classify.
		expect(ImapEmailConnectorStateSchema.map(f => f.propertyKey)).toEqual(["folders"]);
		// Per-folder state is nested under the folder path, so the property is an object.
		expect(ImapEmailConnectorStateSchema[0].type).toBe("object");
	});

	test("ImapEmailConnectorStateSchema marks no state property as secure", () => {
		// The credentials are configured, so nothing in the state needs vaulting.
		expect(ImapEmailConnectorStateSchema.filter(f => f.isSecure)).toEqual([]);
	});

	test("ImapEmailConnectorStateSchema can be registered in the state schema factory", () => {
		EmailProtocolConnectorStateSchemaFactory.register(
			ImapEmailConnector.NAMESPACE,
			() => ImapEmailConnectorStateSchema
		);
		const schema = EmailProtocolConnectorStateSchemaFactory.get(ImapEmailConnector.NAMESPACE);
		expect(schema).toEqual(ImapEmailConnectorStateSchema);
	});

	test("retrieveStop does not throw when not started", async () => {
		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		await expect(connector.retrieveStop()).resolves.not.toThrow();
	});
});

describe("ImapEmailConnector integration", () => {
	beforeEach(async () => {
		await resetGreenMail();
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);
	});

	test("returns no messages when mailbox is empty", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(retrieved).toHaveLength(0);
	});

	test("can retrieve an email sent via SMTP", async () => {
		await sendTestEmail(
			'"Test Sender" <sender@test.example.com>',
			'"Test Receiver" <receiver@test.example.com>',
			"IMAP integration test message",
			"Hello from the IMAP integration test.",
			'"CC Recipient" <cc@test.example.com>'
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(retrieved).toHaveLength(1);

		const email = retrieved[0];
		expect(email.messageId).toMatch(/^<.+@.+>$/);
		expect(email.subject).toBe("IMAP integration test message");
		expect(email.from?.address).toBe("sender@test.example.com");
		expect(email.from?.name).toBe("Test Sender");
		expect(email.to).toHaveLength(1);
		expect(email.to?.[0].address).toBe("receiver@test.example.com");
		expect(email.to?.[0].name).toBe("Test Receiver");
		expect(email.cc).toHaveLength(1);
		expect(email.cc?.[0].address).toBe("cc@test.example.com");
		expect(email.cc?.[0].name).toBe("CC Recipient");
		expect(email.textContent).toContain("Hello from the IMAP integration test.");
		expect(email.htmlContent).toBeUndefined();
		expect(email.date).toBeTruthy();
		expect(email.flags).toBeDefined();
	});

	test("can retrieve multiple emails sent via SMTP", async () => {
		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"First IMAP message",
			"Body one."
		);
		await sendTestEmail(
			'"Bob" <b@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Second IMAP message",
			"Body two."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(retrieved).toHaveLength(2);

		retrieved.sort((a, b) => (a.subject ?? "").localeCompare(b.subject ?? ""));

		expect(retrieved[0].subject).toBe("First IMAP message");
		expect(retrieved[0].from?.address).toBe("a@test.example.com");
		expect(retrieved[0].from?.name).toBe("Alice");
		expect(retrieved[0].to?.[0].address).toBe("inbox@test.example.com");
		expect(retrieved[0].textContent).toContain("Body one.");

		expect(retrieved[1].subject).toBe("Second IMAP message");
		expect(retrieved[1].from?.address).toBe("b@test.example.com");
		expect(retrieved[1].from?.name).toBe("Bob");
		expect(retrieved[1].to?.[0].address).toBe("inbox@test.example.com");
		expect(retrieved[1].textContent).toContain("Body two.");
	});

	test("can retrieve an email with HTML content and an attachment", async () => {
		const transporter = nodemailer.createTransport({
			host: TEST_IMAP_HOST,
			port: TEST_IMAP_SMTP_PORT,
			secure: false
		});
		await transporter.sendMail({
			envelope: { from: "test@localhost", to: "test@localhost" },
			from: '"HTML Sender" <html@test.example.com>',
			to: '"HTML Receiver" <html-receiver@test.example.com>',
			subject: "IMAP HTML and attachment test",
			text: "Plain text fallback.",
			html: "<h1>Hello</h1><p>This is <strong>HTML</strong> content.</p>",
			attachments: [
				{
					filename: "hello.txt",
					content: "Attachment content.",
					contentType: "text/plain"
				}
			]
		});

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const retrieved: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				if (message) {
					retrieved.push(message);
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(retrieved).toHaveLength(1);

		const email = retrieved[0];
		expect(email.subject).toBe("IMAP HTML and attachment test");
		expect(email.textContent).toContain("Plain text fallback.");
		expect(email.htmlContent).toContain("<h1>Hello</h1>");
		expect(email.htmlContent).toContain("<strong>HTML</strong>");
		const attachments = email.attachments ?? [];
		expect(attachments).toHaveLength(1);
		expect(attachments[0].filename).toBe("hello.txt");
		expect(attachments[0].contentType).toContain("text/plain");
		expect(Converter.bytesToUtf8(Converter.base64ToBytes(attachments[0].data))).toBe(
			"Attachment content."
		);
	});

	test("state tracks last UID so the second poll returns no duplicates", async () => {
		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"State tracking test",
			"First poll."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const state = {};
		const firstPoll: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				if (message) {
					firstPoll.push(message);
				}
				Object.assign(state, updatedState);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(firstPoll).toHaveLength(1);

		const secondPoll: IEmail[] = [];
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				if (message) {
					secondPoll.push(message);
				}
				Object.assign(state, updatedState);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(secondPoll).toHaveLength(0);
	});

	test("redelivers a message whose persist failed on the next poll", async () => {
		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Persisted message",
			"Body one."
		);
		await sendTestEmail(
			'"Bob" <b@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Failed message",
			"Body two."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const state = {};

		const firstPoll: IEmail[] = [];
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				if (message) {
					firstPoll.push(message);
				}
				Object.assign(state, updatedState);
				return firstPoll.length < 2;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(firstPoll.map(m => m.subject)).toEqual(["Persisted message", "Failed message"]);

		const secondPoll: IEmail[] = [];
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				if (message) {
					secondPoll.push(message);
				}
				Object.assign(state, updatedState);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(secondPoll.map(m => m.subject)).toEqual(["Failed message"]);

		const thirdPoll: IEmail[] = [];
		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				if (message) {
					thirdPoll.push(message);
				}
				Object.assign(state, updatedState);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();
		expect(thirdPoll).toHaveLength(0);
	});

	test("reports auth failure when credentials are invalid", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({
			config: { ...TEST_IMAP_CONFIG, password: "wrong-password" }
		});
		let authRequired = false;
		let authError: IError | undefined;

		await connector.retrieve(
			"test-instance",
			{},
			async (mailboxId, updatedState, requiresAuth, authState, callbackError) => {
				authRequired = requiresAuth;
				authError = callbackError;
			},
			async () => true,
			TEST_OPTIONS
		);

		await runPending();

		expect(authRequired).toBe(true);
		expect(authError).toBeDefined();
	});

	test("calls callback once per message", async () => {
		await resetGreenMail();

		for (let i = 1; i <= 5; i++) {
			await sendTestEmail(
				`"Sender ${i}" <s${i}@test.example.com>`,
				'"Inbox" <inbox@test.example.com>',
				`Batch message ${i}`,
				`Body ${i}.`
			);
		}

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const state = {};

		const callCount: number[] = [];
		const allMessages: IEmail[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message, updatedState) => {
				callCount.push(1);
				if (message) {
					allMessages.push(message);
				}
				Object.assign(state, updatedState);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(callCount).toHaveLength(5);
		expect(allMessages).toHaveLength(5);
		expect(allMessages.map(m => m.subject)).toContain("Batch message 1");
		expect(allMessages.map(m => m.subject)).toContain("Batch message 5");
	});

	test("calls callback once for a single message", async () => {
		await resetGreenMail();

		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Single message",
			"Body."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });
		const state = {};

		const callCount: number[] = [];

		await connector.retrieve(
			"test-instance",
			state,
			async () => {},
			async (mailboxId, message) => {
				callCount.push(1);
				return true;
			},
			TEST_OPTIONS
		);
		await runPending();

		expect(callCount).toHaveLength(1);
	});
});

describe("ImapEmailConnector per-message callback behaviour", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test("delivers messages individually even when an error occurs mid-stream", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(ImapFlow.prototype, "connect").mockImplementation(async () => undefined);
		vi.spyOn(ImapFlow.prototype, "getMailboxLock").mockImplementation(
			async function mockGetMailboxLock(this: ImapFlow) {
				this.mailbox = { uidValidity: 1n } as unknown as ImapFlow["mailbox"];
				return { path: "INBOX", release: vi.fn() };
			}
		);
		vi.spyOn(ImapFlow.prototype, "search").mockResolvedValue([1, 2, 3, 4]);
		vi.spyOn(ImapFlow.prototype, "fetch").mockReturnValue(makeMessageStream(4, 3));
		vi.spyOn(ImapFlow.prototype, "logout").mockImplementation(async () => undefined);
		vi.spyOn(ImapFlow.prototype, "close").mockImplementation(() => undefined);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });

		const callCount: number[] = [];
		const errors: (IError | undefined)[] = [];

		await connector.retrieve(
			"test-id",
			{},
			async () => {},
			async (mailboxId, message, state, retrievalError) => {
				if (message) {
					callCount.push(1);
				} else {
					errors.push(retrievalError);
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(callCount).toHaveLength(3);
		expect(errors).toHaveLength(1);
		expect(errors[0]?.message).toBe("imapEmailConnector.pollFailed");
	});

	test("does not deliver messages when a connection error occurs before any messages", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(ImapFlow.prototype, "connect").mockRejectedValue(new Error("Connection refused"));
		vi.spyOn(ImapFlow.prototype, "close").mockImplementation(() => undefined);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });

		const callCount: number[] = [];
		const errors: (IError | undefined)[] = [];

		await connector.retrieve(
			"test-id",
			{},
			async () => {},
			async (mailboxId, message, state, retrievalError) => {
				if (message) {
					callCount.push(1);
				} else {
					errors.push(retrievalError);
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(callCount).toHaveLength(0);
		expect(errors).toHaveLength(1);
		expect(errors[0]?.message).toBe("imapEmailConnector.pollFailed");
	});

	test("exits the polling loop when callback returns false", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(ImapFlow.prototype, "connect").mockImplementation(async () => undefined);
		vi.spyOn(ImapFlow.prototype, "getMailboxLock").mockImplementation(
			async function mockGetMailboxLock(this: ImapFlow) {
				this.mailbox = { uidValidity: 1n } as unknown as ImapFlow["mailbox"];
				return { path: "INBOX", release: vi.fn() };
			}
		);
		vi.spyOn(ImapFlow.prototype, "search").mockResolvedValue([1, 2, 3, 4]);
		const stream = makeMessageStream(4);
		vi.spyOn(ImapFlow.prototype, "fetch").mockReturnValue(stream);
		vi.spyOn(ImapFlow.prototype, "logout").mockImplementation(async () => undefined);
		vi.spyOn(ImapFlow.prototype, "close").mockImplementation(() => undefined);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });

		const callCount: number[] = [];

		await connector.retrieve(
			"test-id",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				callCount.push(1);
				return callCount.length < 2;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(callCount).toHaveLength(2);
		expect(stream.terminated).toBe(true);
	});

	test("terminates the fetch stream when retrieveStop is called mid-stream", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(ImapFlow.prototype, "connect").mockImplementation(async () => undefined);
		vi.spyOn(ImapFlow.prototype, "getMailboxLock").mockImplementation(
			async function mockGetMailboxLock(this: ImapFlow) {
				this.mailbox = { uidValidity: 1n } as unknown as ImapFlow["mailbox"];
				return { path: "INBOX", release: vi.fn() };
			}
		);
		vi.spyOn(ImapFlow.prototype, "search").mockResolvedValue([1, 2, 3, 4]);
		const stream = makeMessageStream(4);
		vi.spyOn(ImapFlow.prototype, "fetch").mockReturnValue(stream);
		const logoutSpy = vi
			.spyOn(ImapFlow.prototype, "logout")
			.mockImplementation(async () => undefined);
		vi.spyOn(ImapFlow.prototype, "close").mockImplementation(() => undefined);

		const connector = new ImapEmailConnector({ config: TEST_IMAP_CONFIG });

		const callCount: number[] = [];

		await connector.retrieve(
			"test-id",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				callCount.push(1);
				await connector.retrieveStop();
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(callCount).toHaveLength(1);
		expect(stream.terminated).toBe(true);
		expect(logoutSpy).toHaveBeenCalledTimes(1);
	});
});

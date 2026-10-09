// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import { ComponentFactory, Converter } from "@3sixty/core";
import type { IError } from "@3sixty/core";
import {
	EmailProtocolConnectorFactory,
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory,
	type IEmail,
	type IEmailProtocolConnectorOptions
} from "@3sixty/mailbox-models";
import Pop3Command from "node-pop3";
import { createTransport } from "nodemailer";
import {
	TEST_POP3_CONFIG,
	TEST_POP3_HOST,
	TEST_POP3_HTTP_PORT,
	TEST_POP3_SMTP_PORT
} from "./setupTestEnv.js";
import { Pop3EmailConnectorConfigSchema } from "../src/connectorSchema/pop3EmailConnectorConfigSchema.js";
import { Pop3EmailConnectorStateSchema } from "../src/connectorSchema/pop3EmailConnectorStateSchema.js";
import { Pop3EmailConnector } from "../src/pop3EmailConnector.js";

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

function makeUidlResponse(count: number): string[][] {
	return Array.from({ length: count }, (v, i) => [`${i + 1}`, `uid${i + 1}`]);
}

async function resetGreenMail(): Promise<void> {
	await fetch(`http://${TEST_POP3_HOST}:${TEST_POP3_HTTP_PORT}/api/service/reset`, {
		method: "POST"
	});
	await fetch(`http://${TEST_POP3_HOST}:${TEST_POP3_HTTP_PORT}/api/user`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: `${TEST_POP3_CONFIG.username}@localhost`,
			login: TEST_POP3_CONFIG.username,
			password: TEST_POP3_CONFIG.password
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
	const transporter = createTransport({
		host: TEST_POP3_HOST,
		port: TEST_POP3_SMTP_PORT,
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

describe("Pop3EmailConnector", () => {
	beforeEach(() => {
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);
	});

	test("can register in the factory", () => {
		EmailProtocolConnectorFactory.register(
			Pop3EmailConnector.NAMESPACE,
			config => new Pop3EmailConnector({ config: config as typeof TEST_POP3_CONFIG })
		);
		const connector = EmailProtocolConnectorFactory.create(
			Pop3EmailConnector.NAMESPACE,
			TEST_POP3_CONFIG
		);
		expect(connector).toBeDefined();
		expect(connector.className()).toBe("Pop3EmailConnector");
	});

	test("NAMESPACE is pop3", () => {
		expect(Pop3EmailConnector.NAMESPACE).toBe("pop3");
	});

	test("Pop3EmailConnectorConfigSchema declares isSecure on password field", () => {
		const passwordField = Pop3EmailConnectorConfigSchema.find(f => f.propertyKey === "password");
		expect(passwordField).toBeDefined();
		expect(passwordField?.isSecure).toBe(true);
	});

	test("Pop3EmailConnectorConfigSchema can be registered in schema factory", () => {
		EmailProtocolConnectorConfigSchemaFactory.register(
			Pop3EmailConnector.NAMESPACE,
			() => Pop3EmailConnectorConfigSchema
		);
		const schema = EmailProtocolConnectorConfigSchemaFactory.get(Pop3EmailConnector.NAMESPACE);
		expect(schema).toHaveLength(Pop3EmailConnectorConfigSchema.length);
	});

	test("Pop3EmailConnectorStateSchema describes every state property", () => {
		// The schema is what the owning component persists the state through, so a property
		// missing from it is a property the component cannot classify.
		expect(Pop3EmailConnectorStateSchema.map(f => f.propertyKey)).toEqual(["seenUidls"]);
		expect(Pop3EmailConnectorStateSchema[0]).toMatchObject({
			type: "array",
			itemType: "string"
		});
	});

	test("Pop3EmailConnectorStateSchema marks no state property as secure", () => {
		// The credentials are configured, so nothing in the state needs vaulting.
		expect(Pop3EmailConnectorStateSchema.filter(f => f.isSecure)).toEqual([]);
	});

	test("Pop3EmailConnectorStateSchema can be registered in the state schema factory", () => {
		EmailProtocolConnectorStateSchemaFactory.register(
			Pop3EmailConnector.NAMESPACE,
			() => Pop3EmailConnectorStateSchema
		);
		const schema = EmailProtocolConnectorStateSchemaFactory.get(Pop3EmailConnector.NAMESPACE);
		expect(schema).toEqual(Pop3EmailConnectorStateSchema);
	});

	test("retrieveStop does not throw when not started", async () => {
		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
		await expect(connector.retrieveStop()).resolves.not.toThrow();
	});
});

describe("Pop3EmailConnector integration", () => {
	beforeEach(async () => {
		await resetGreenMail();
		const { scheduler } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);
	});

	test("returns no messages when mailbox is empty", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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
			"Integration test message",
			"Hello from the integration test.",
			'"CC Recipient" <cc@test.example.com>'
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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
		expect(email.subject).toBe("Integration test message");
		expect(email.from?.address).toBe("sender@test.example.com");
		expect(email.from?.name).toBe("Test Sender");
		expect(email.to).toHaveLength(1);
		expect(email.to?.[0].address).toBe("receiver@test.example.com");
		expect(email.to?.[0].name).toBe("Test Receiver");
		expect(email.cc).toHaveLength(1);
		expect(email.cc?.[0].address).toBe("cc@test.example.com");
		expect(email.cc?.[0].name).toBe("CC Recipient");
		expect(email.textContent).toContain("Hello from the integration test.");
		expect(email.htmlContent).toBeUndefined();
		expect(email.date).toBeTruthy();
	});

	test("can retrieve multiple emails sent via SMTP", async () => {
		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"First message",
			"Body one."
		);
		await sendTestEmail(
			'"Bob" <b@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Second message",
			"Body two."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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

		expect(retrieved[0].subject).toBe("First message");
		expect(retrieved[0].from?.address).toBe("a@test.example.com");
		expect(retrieved[0].from?.name).toBe("Alice");
		expect(retrieved[0].to?.[0].address).toBe("inbox@test.example.com");
		expect(retrieved[0].textContent).toContain("Body one.");

		expect(retrieved[1].subject).toBe("Second message");
		expect(retrieved[1].from?.address).toBe("b@test.example.com");
		expect(retrieved[1].from?.name).toBe("Bob");
		expect(retrieved[1].to?.[0].address).toBe("inbox@test.example.com");
		expect(retrieved[1].textContent).toContain("Body two.");
	});

	test("can retrieve an email with HTML content and an attachment", async () => {
		const transporter = createTransport({
			host: TEST_POP3_HOST,
			port: TEST_POP3_SMTP_PORT,
			secure: false
		});
		await transporter.sendMail({
			envelope: { from: "test@localhost", to: "test@localhost" },
			from: '"HTML Sender" <html@test.example.com>',
			to: '"HTML Receiver" <html-receiver@test.example.com>',
			subject: "HTML and attachment test",
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

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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
		expect(email.subject).toBe("HTML and attachment test");
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

	test("reports auth failure when credentials are invalid", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new Pop3EmailConnector({
			config: { ...TEST_POP3_CONFIG, password: "wrong-password" }
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

	test("when retainMessages is true (default), second poll returns no duplicate messages", async () => {
		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"First retained message",
			"Body one."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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
		expect(firstPoll[0].subject).toBe("First retained message");

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

		await sendTestEmail(
			'"Bob" <b@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Second retained message",
			"Body two."
		);

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
		expect(thirdPoll).toHaveLength(1);
		expect(thirdPoll[0].subject).toBe("Second retained message");
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

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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

	test("when retainMessages is false, messages are deleted and second poll handles new messages correctly", async () => {
		await sendTestEmail(
			'"Alice" <a@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"First non-retained message",
			"Body one."
		);

		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const connector = new Pop3EmailConnector({
			config: { ...TEST_POP3_CONFIG, retainMessages: false }
		});
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
		expect(firstPoll[0].subject).toBe("First non-retained message");

		await sendTestEmail(
			'"Bob" <b@test.example.com>',
			'"Inbox" <inbox@test.example.com>',
			"Second non-retained message",
			"Body two."
		);

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
		expect(secondPoll).toHaveLength(1);
		expect(secondPoll[0].subject).toBe("Second non-retained message");
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

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });
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

describe("Pop3EmailConnector per-message callback behaviour", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	test("delivers messages individually even when an error occurs mid-stream", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const retr = vi.fn().mockImplementation(async (n: number) => {
			if (n > 3) {
				throw new Error("Connection lost");
			}
			return MINIMAL_RAW_EMAIL;
		});

		vi.spyOn(Pop3Command.prototype, "UIDL").mockResolvedValue(makeUidlResponse(4));
		vi.spyOn(Pop3Command.prototype, "RETR").mockImplementation(retr);
		vi.spyOn(Pop3Command.prototype, "DELE").mockResolvedValue("");
		vi.spyOn(Pop3Command.prototype, "QUIT").mockResolvedValue("");

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });

		const callCount: number[] = [];
		const errors: unknown[] = [];

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
	});

	test("stops after the messages successfully retrieved before an error", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const retr = vi.fn().mockImplementation(async (n: number) => {
			if (n > 2) {
				throw new Error("Connection lost");
			}
			return MINIMAL_RAW_EMAIL;
		});

		vi.spyOn(Pop3Command.prototype, "UIDL").mockResolvedValue(makeUidlResponse(5));
		vi.spyOn(Pop3Command.prototype, "RETR").mockImplementation(retr);
		vi.spyOn(Pop3Command.prototype, "DELE").mockResolvedValue("");
		vi.spyOn(Pop3Command.prototype, "QUIT").mockResolvedValue("");

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });

		const callCount: number[] = [];
		const errors: unknown[] = [];

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

		expect(callCount).toHaveLength(2);
		expect(errors).toHaveLength(1);
	});

	test("exits the polling loop when callback returns false", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(Pop3Command.prototype, "UIDL").mockResolvedValue(makeUidlResponse(4));
		vi.spyOn(Pop3Command.prototype, "RETR").mockResolvedValue(MINIMAL_RAW_EMAIL);
		vi.spyOn(Pop3Command.prototype, "DELE").mockResolvedValue("");
		vi.spyOn(Pop3Command.prototype, "QUIT").mockResolvedValue("");

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });

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
	});

	test("deletes each persisted message before a later RETR fails when retainMessages is false", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		const retr = vi.fn().mockImplementation(async (n: number) => {
			if (n > 2) {
				throw new Error("Connection lost");
			}
			return MINIMAL_RAW_EMAIL;
		});

		vi.spyOn(Pop3Command.prototype, "UIDL").mockResolvedValue(makeUidlResponse(4));
		vi.spyOn(Pop3Command.prototype, "RETR").mockImplementation(retr);
		const deleSpy = vi.spyOn(Pop3Command.prototype, "DELE").mockResolvedValue("");
		const quitSpy = vi.spyOn(Pop3Command.prototype, "QUIT").mockResolvedValue("");

		const connector = new Pop3EmailConnector({
			config: { ...TEST_POP3_CONFIG, retainMessages: false }
		});

		let lastState: { seenUidls?: string[] } | undefined;

		await connector.retrieve(
			"test-id",
			{},
			async () => {},
			async (mailboxId, message, state) => {
				if (message) {
					lastState = state as { seenUidls?: string[] };
				}
				return true;
			},
			TEST_OPTIONS
		);

		await runPending();

		expect(deleSpy.mock.calls.map(call => call[0])).toEqual([1, 2]);
		expect(lastState?.seenUidls).toHaveLength(2);
		expect(quitSpy).toHaveBeenCalledTimes(1);
	});

	test("does not delete a message whose persist failed", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(Pop3Command.prototype, "UIDL").mockResolvedValue(makeUidlResponse(3));
		vi.spyOn(Pop3Command.prototype, "RETR").mockResolvedValue(MINIMAL_RAW_EMAIL);
		const deleSpy = vi.spyOn(Pop3Command.prototype, "DELE").mockResolvedValue("");
		vi.spyOn(Pop3Command.prototype, "QUIT").mockResolvedValue("");

		const connector = new Pop3EmailConnector({
			config: { ...TEST_POP3_CONFIG, retainMessages: false }
		});

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
		expect(deleSpy.mock.calls.map(call => call[0])).toEqual([1]);
	});

	test("releases the mutex when retrieveStop is called mid-loop", async () => {
		const { scheduler, runPending } = makeScheduler();
		ComponentFactory.register("task-scheduler", () => scheduler);

		vi.spyOn(Pop3Command.prototype, "UIDL").mockResolvedValue(makeUidlResponse(4));
		vi.spyOn(Pop3Command.prototype, "RETR").mockResolvedValue(MINIMAL_RAW_EMAIL);
		vi.spyOn(Pop3Command.prototype, "DELE").mockResolvedValue("");
		const quitSpy = vi.spyOn(Pop3Command.prototype, "QUIT").mockResolvedValue("");

		const connector = new Pop3EmailConnector({ config: TEST_POP3_CONFIG });

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
		expect(quitSpy).toHaveBeenCalledTimes(1);
	});
});

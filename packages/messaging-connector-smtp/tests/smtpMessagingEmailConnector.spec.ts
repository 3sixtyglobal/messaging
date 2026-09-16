// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import PostalMime, { type Email } from "postal-mime";
import {
	TEST_SMTP_CONFIG,
	TEST_SMTP_HOST,
	TEST_SMTP_HTTP_PORT,
	TEST_SMTP_USERNAME,
	TEST_SMTP_PASSWORD
} from "./setupTestEnv.js";
import { SmtpMessagingEmailConnector } from "../src/smtpMessagingEmailConnector.js";

async function getMessages(): Promise<Email[]> {
	const response = await fetch(
		`http://${TEST_SMTP_HOST}:${TEST_SMTP_HTTP_PORT}/api/user/${TEST_SMTP_USERNAME}@localhost/messages/INBOX`
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
	}

	const payload = (await response.json()) as {
		mimeMessage?: string;
		raw?: string;
		message?: string;
	}[];

	return Promise.all(
		payload.map(async message => {
			const raw = message.mimeMessage ?? message.raw ?? message.message ?? "";
			return PostalMime.parse(raw);
		})
	);
}

async function resetGreenMail(): Promise<void> {
	await fetch(`http://${TEST_SMTP_HOST}:${TEST_SMTP_HTTP_PORT}/api/service/reset`, {
		method: "POST"
	});
	await fetch(`http://${TEST_SMTP_HOST}:${TEST_SMTP_HTTP_PORT}/api/user`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: `${TEST_SMTP_USERNAME}@localhost`,
			login: TEST_SMTP_USERNAME,
			password: TEST_SMTP_PASSWORD
		})
	});
}

describe("SmtpMessagingEmailConnector", () => {
	test("NAMESPACE is smtp", () => {
		expect(SmtpMessagingEmailConnector.NAMESPACE).toBe("smtp");
	});

	test("throws when options are undefined", () => {
		expect(() => new SmtpMessagingEmailConnector(undefined as never)).toThrow();
	});

	test("throws when config is undefined", () => {
		expect(
			() =>
				new SmtpMessagingEmailConnector({
					config: undefined as never
				})
		).toThrow();
	});

	test("throws when host is missing", () => {
		expect(
			() =>
				new SmtpMessagingEmailConnector({
					config: { host: "" }
				})
		).toThrow();
	});

	test("throws when sender is invalid", async () => {
		const connector = new SmtpMessagingEmailConnector({ config: TEST_SMTP_CONFIG });
		await expect(
			connector.sendCustomEmail(
				undefined as unknown as string,
				["recipient@example.com"],
				"Subject",
				"<p>Content</p>"
			)
		).rejects.toMatchObject({ name: "GuardError", properties: { property: "sender" } });
	});

	test("throws when recipients is invalid", async () => {
		const connector = new SmtpMessagingEmailConnector({ config: TEST_SMTP_CONFIG });
		await expect(
			connector.sendCustomEmail(
				"sender@example.com",
				undefined as unknown as string[],
				"Subject",
				"<p>Content</p>"
			)
		).rejects.toMatchObject({ name: "GuardError", properties: { property: "recipients" } });
	});

	test("throws when subject is invalid", async () => {
		const connector = new SmtpMessagingEmailConnector({ config: TEST_SMTP_CONFIG });
		await expect(
			connector.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				undefined as unknown as string,
				"<p>Content</p>"
			)
		).rejects.toMatchObject({ name: "GuardError", properties: { property: "subject" } });
	});

	test("throws when content is invalid", async () => {
		const connector = new SmtpMessagingEmailConnector({ config: TEST_SMTP_CONFIG });
		await expect(
			connector.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				"Subject",
				undefined as unknown as string
			)
		).rejects.toMatchObject({ name: "GuardError", properties: { property: "content" } });
	});
});

describe("SmtpMessagingEmailConnector integration", () => {
	beforeEach(async () => {
		await resetGreenMail();
	});

	test("can send a custom email", async () => {
		const connector = new SmtpMessagingEmailConnector({ config: TEST_SMTP_CONFIG });

		const result = await connector.sendCustomEmail(
			"sender@test.example.com",
			[`${TEST_SMTP_USERNAME}@localhost`],
			"Integration test",
			"<p>Hello from the integration test.</p>"
		);

		expect(result).toBe(true);

		const messages = await getMessages();
		expect(messages).toHaveLength(1);

		const message = messages[0];
		expect(message.from?.address).toBe("sender@test.example.com");
		expect(message.to).toHaveLength(1);
		expect(message.to?.[0].address).toBe(`${TEST_SMTP_USERNAME}@localhost`);
		expect(message.subject).toBe("Integration test");
		expect(message.html).toContain("Hello from the integration test.");
	});

	test("can send to multiple recipients", async () => {
		const connector = new SmtpMessagingEmailConnector({ config: TEST_SMTP_CONFIG });

		const result = await connector.sendCustomEmail(
			"sender@test.example.com",
			[`${TEST_SMTP_USERNAME}@localhost`],
			"Multi-recipient test",
			"<p>Hello everyone.</p>"
		);

		expect(result).toBe(true);

		const messages = await getMessages();
		expect(messages.length).toBeGreaterThanOrEqual(1);

		const message = messages[0];
		expect(message.subject).toBe("Multi-recipient test");
	});

	test("wraps SMTP errors in GeneralError", async () => {
		const connector = new SmtpMessagingEmailConnector({
			config: { host: "localhost", port: 19999, secure: false }
		});

		await expect(
			connector.sendCustomEmail(
				"sender@test.example.com",
				["recipient@test.example.com"],
				"Will fail",
				"<p>Content</p>"
			)
		).rejects.toMatchObject({ name: "GeneralError" });
	});
});

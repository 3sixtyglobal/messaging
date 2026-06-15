// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { EmailEntry } from "../src/entities/emailEntry.js";
import { EntityStorageMessagingEmailConnector } from "../src/entityStorageMessagingEmailConnector.js";
import { initSchema } from "../src/schema.js";

describe("EntityStorageMessagingEmailConnector", () => {
	beforeAll(() => {
		initSchema();
		EntityStorageConnectorFactory.register(
			"email-entry",
			() =>
				new MemoryEntityStorageConnector<EmailEntry>({
					entitySchema: nameof<EmailEntry>(),
					config: { storageKey: "email-entry" }
				})
		);
	});

	test("can construct", async () => {
		const storage = new EntityStorageMessagingEmailConnector();
		expect(storage).toBeDefined();
	});

	test("throws error when sending email with invalid sender", async () => {
		const storage = new EntityStorageMessagingEmailConnector({
			messagingEmailEntryStorageConnectorType: "email-entry"
		});
		await expect(
			storage.sendCustomEmail(
				undefined as unknown as string,
				["recipient@example.com"],
				"Test Subject",
				"<p>Test Content</p>"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "sender",
				value: "undefined"
			}
		});
	});

	test("throws error when sending email with invalid recipients", async () => {
		const storage = new EntityStorageMessagingEmailConnector({
			messagingEmailEntryStorageConnectorType: "email-entry"
		});
		await expect(
			storage.sendCustomEmail(
				"sender@example.com",
				undefined as unknown as string[],
				"Test Subject",
				"<p>Test Content</p>"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "recipients",
				value: "undefined"
			}
		});
	});

	test("throws error when sending email with invalid subject", async () => {
		const storage = new EntityStorageMessagingEmailConnector({
			messagingEmailEntryStorageConnectorType: "email-entry"
		});
		await expect(
			storage.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				undefined as unknown as string,
				"<p>Test Content</p>"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "subject",
				value: "undefined"
			}
		});
	});

	test("throws error when sending email with invalid content", async () => {
		const storage = new EntityStorageMessagingEmailConnector({
			messagingEmailEntryStorageConnectorType: "email-entry"
		});
		await expect(
			storage.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				"Test Subject",
				undefined as unknown as string
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "content",
				value: "undefined"
			}
		});
	});

	test("can send custom email", async () => {
		const storage = new EntityStorageMessagingEmailConnector({
			messagingEmailEntryStorageConnectorType: "email-entry"
		});
		const result = await storage.sendCustomEmail(
			"sender@example.com",
			["recipient@example.com"],
			"Test Subject",
			"<p>Test Content</p>"
		);
		expect(result).toBe(true);
		const entries = await EntityStorageConnectorFactory.get("email-entry").query();
		expect(entries.entities).toBeDefined();
		expect(entries.entities.length).toBe(1);
		expect((entries.entities[0] as EmailEntry).sender).toBe("sender@example.com");
		expect((entries.entities[0] as EmailEntry).recipients).toStrictEqual(["recipient@example.com"]);
		expect((entries.entities[0] as EmailEntry).subject).toBe("Test Subject");
		expect((entries.entities[0] as EmailEntry).message).toBe("<p>Test Content</p>");
	});
});

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { SmsEntry } from "../src/entities/smsEntry.js";
import { EntityStorageMessagingSmsConnector } from "../src/entityStorageMessagingSmsConnector.js";
import { initSchema } from "../src/schema.js";

describe("EntityStorageMessagingSmsConnector", () => {
	beforeAll(() => {
		initSchema();
		EntityStorageConnectorFactory.register(
			"sms-entry",
			() =>
				new MemoryEntityStorageConnector<SmsEntry>({
					entitySchema: nameof<SmsEntry>(),
					config: { storageKey: "sms-entry" }
				})
		);
	});

	test("can construct", async () => {
		const storage = new EntityStorageMessagingSmsConnector();
		expect(storage).toBeDefined();
	});

	test("fails to send sms with invalid phone number", async () => {
		const storage = new EntityStorageMessagingSmsConnector({
			messagingSmsEntryStorageConnectorType: "sms-entry"
		});
		await expect(
			storage.sendSMS(undefined as unknown as string, "Test Content")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "phoneNumber",
				value: "undefined"
			}
		});
	});

	test("fails to send sms with empty message", async () => {
		const storage = new EntityStorageMessagingSmsConnector({
			messagingSmsEntryStorageConnectorType: "sms-entry"
		});
		await expect(
			storage.sendSMS("+1234567890", undefined as unknown as string)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "message",
				value: "undefined"
			}
		});
	});

	test("can send custom sms", async () => {
		const storage = new EntityStorageMessagingSmsConnector({
			messagingSmsEntryStorageConnectorType: "sms-entry"
		});
		const result = await storage.sendSMS("+1234567890", "Test Content");
		expect(result).toBe(true);
		const entries = await EntityStorageConnectorFactory.get("sms-entry").query();
		expect(entries.entities).toBeDefined();
		expect(entries.entities.length).toBe(1);
		expect((entries.entities[0] as SmsEntry).phoneNumber).toBe("+1234567890");
		expect((entries.entities[0] as SmsEntry).message).toBe("Test Content");
	});
});

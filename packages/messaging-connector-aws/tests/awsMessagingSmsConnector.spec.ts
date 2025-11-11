// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageLoggingConnector,
	type LogEntry,
	initSchema
} from "@twin.org/logging-connector-entity-storage";
import { LoggingConnectorFactory } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import { TEST_AWS_CONFIG } from "./setupTestEnv.js";
import { AwsMessagingSmsConnector } from "../src/awsMessagingSmsConnector.js";
import type { IAwsSmsConnectorConfig } from "../src/models/IAwsSmsConnectorConfig.js";

let memoryEntityStorage: MemoryEntityStorageConnector<LogEntry>;
const configuration: IAwsSmsConnectorConfig = TEST_AWS_CONFIG;

describe("AwsMessagingSmsConnector", () => {
	beforeAll(async () => {
		initSchema();
	});

	beforeEach(async () => {
		memoryEntityStorage = new MemoryEntityStorageConnector<LogEntry>({
			entitySchema: nameof<LogEntry>()
		});
		EntityStorageConnectorFactory.register("log-entry", () => memoryEntityStorage);
		LoggingConnectorFactory.register("logging", () => new EntityStorageLoggingConnector());
	});

	test("can fail to construct when there are no options", async () => {
		expect(
			() =>
				new AwsMessagingSmsConnector(
					undefined as unknown as {
						entitySchema: string;
						config: IAwsSmsConnectorConfig;
					}
				)
		).toThrow(
			expect.objectContaining({
				name: "GuardError",
				message: "guard.objectUndefined",
				properties: {
					property: "options",
					value: "undefined"
				}
			})
		);
	});

	test("can fail to send SMS without phoneNumber", async () => {
		const messagingConnector = new AwsMessagingSmsConnector({
			config: configuration
		});
		await expect(
			messagingConnector.sendSMS(undefined as unknown as string, "Test message")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "phoneNumber",
				value: "undefined"
			}
		});
	});

	test("can fail to send SMS without message", async () => {
		const messagingConnector = new AwsMessagingSmsConnector({
			config: configuration
		});
		await expect(
			messagingConnector.sendSMS("+1234567890", undefined as unknown as string)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "message",
				value: "undefined"
			}
		});
	});

	test("can send SMS", async () => {
		const messagingConnector = new AwsMessagingSmsConnector({
			config: configuration
		});
		const result = await messagingConnector.sendSMS("+1234567890", "Test message");
		expect(result).toEqual(true);
	});
});

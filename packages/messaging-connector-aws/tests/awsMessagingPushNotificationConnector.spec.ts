// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { I18n } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageLoggingConnector,
	type LogEntry,
	initSchema
} from "@twin.org/logging-connector-entity-storage";
import { LoggingConnectorFactory } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import { TEST_AWS_CONFIG_PUSH } from "./setupTestEnv";
import { AwsMessagingPushNotificationConnector } from "../src/awsMessagingPushNotificationConnector";
import type { IAwsPushNotificationConnectorConfig } from "../src/models/IAwsPushNotificationConnectorConfig";

let memoryEntityStorage: MemoryEntityStorageConnector<LogEntry>;
const configuration: IAwsPushNotificationConnectorConfig = TEST_AWS_CONFIG_PUSH;

describe("AwsMessagingPushNotificationConnector", () => {
	beforeAll(async () => {
		I18n.addDictionary("en", await import("../locales/en.json"));

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
				new AwsMessagingPushNotificationConnector(
					undefined as unknown as {
						entitySchema: string;
						config: IAwsPushNotificationConnectorConfig;
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

	test("can fail to register a device without applicationId", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		await expect(
			messagingConnector.registerDevice(undefined as unknown as string, "deviceToken")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "applicationId"
			}
		});
	});

	test("can fail to register a device without deviceToken", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		await expect(
			messagingConnector.registerDevice("applicationId", undefined as unknown as string)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "deviceToken",
				value: "undefined"
			}
		});
	});

	test("can register a device", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		const applicationId = "TestApp";
		await messagingConnector.start("");
		const deviceToken = "testDeviceToken";
		const result = await messagingConnector.registerDevice(applicationId, deviceToken);
		expect(result).toBeDefined();
		expect(result.length).toBeGreaterThan(0);
	});

	test("can fail to register a device without starting the app", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		const applicationId = "TestApp";
		const deviceToken = "testDeviceToken";
		await expect(
			messagingConnector.registerDevice(applicationId, deviceToken)
		).rejects.toMatchObject({
			name: "GeneralError",
			properties: {
				applicationId: "TestApp"
			}
		});
	});

	test("can fail to send push notification without deviceAddress", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		await expect(
			messagingConnector.sendSinglePushNotification(
				undefined as unknown as string,
				"Test Title",
				"Test message"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "deviceAddress",
				value: "undefined"
			}
		});
	});

	test("can fail to send push notification without title", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		await expect(
			messagingConnector.sendSinglePushNotification(
				"deviceAddress",
				undefined as unknown as string,
				"Test message"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "title",
				value: "undefined"
			}
		});
	});

	test("can fail to send push notification without message", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		await expect(
			messagingConnector.sendSinglePushNotification(
				"deviceAddress",
				"Test Title",
				undefined as unknown as string
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "message",
				value: "undefined"
			}
		});
	});

	test("can send push notification", async () => {
		const messagingConnector = new AwsMessagingPushNotificationConnector({
			config: configuration
		});
		const applicationId = "TestApp";
		await messagingConnector.start("");
		const deviceToken = "testDeviceToken";
		const deviceAddress = await messagingConnector.registerDevice(applicationId, deviceToken);
		const result = await messagingConnector.sendSinglePushNotification(
			deviceAddress,
			"Test Title",
			"Test message"
		);
		expect(result).toBeDefined();
		expect(result).toBe(true);
	});
});

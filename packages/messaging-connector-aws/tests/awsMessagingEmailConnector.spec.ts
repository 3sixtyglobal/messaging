// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
/* eslint-disable max-classes-per-file */
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
import { TEST_AWS_CONFIG } from "./setupTestEnv";
import { AwsMessagingEmailConnector } from "../src/awsMessagingEmailConnector";
import type { IAwsEmailConnectorConfig } from "../src/models/IAwsEmailConnectorConfig";

let memoryEntityStorage: MemoryEntityStorageConnector<LogEntry>;
const configuration: IAwsEmailConnectorConfig = TEST_AWS_CONFIG;

describe("AwsMessagingEmailConnector", () => {
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
				new AwsMessagingEmailConnector(
					undefined as unknown as {
						entitySchema: string;
						config: IAwsEmailConnectorConfig;
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

	test("can fail to send a custom email without sender", async () => {
		const entityStorage = new AwsMessagingEmailConnector({
			config: configuration
		});
		await expect(
			entityStorage.sendCustomEmail(undefined as unknown as string, [], "Subject", "Content")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "sender",
				value: "undefined"
			}
		});
	});

	test("can fail to send a custom email without recipients", async () => {
		const entityStorage = new AwsMessagingEmailConnector({
			config: configuration
		});
		await expect(
			entityStorage.sendCustomEmail(
				"sender@example.com",
				undefined as unknown as string[],
				"Subject",
				"Content"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "recipients",
				value: "undefined"
			}
		});
	});

	test("can fail to send a custom email without subject", async () => {
		const entityStorage = new AwsMessagingEmailConnector({
			config: configuration
		});
		await expect(
			entityStorage.sendCustomEmail(
				"sender@example.com",
				["receiver1@example.com"],
				undefined as unknown as string,
				"Content"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "subject",
				value: "undefined"
			}
		});
	});

	test("can fail to send a custom email without content", async () => {
		const entityStorage = new AwsMessagingEmailConnector({
			config: configuration
		});
		await expect(
			entityStorage.sendCustomEmail(
				"sender@example.com",
				["receiver1@example.com"],
				"Subject",
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

	test("can send a custom email to a single receiver", async () => {
		const messagingConnector = new AwsMessagingEmailConnector({
			config: configuration
		});

		const result = await messagingConnector.sendCustomEmail(
			"sender@example.com",
			["receiver1@example.com"],
			"Custom Email",
			"<body><h1>Hi, Joe!</h1><p>This is a custom email.</p></body>"
		);
		expect(result).toEqual(true);
	});

	test("can send a custom email to multiple recipients", async () => {
		const messagingConnector = new AwsMessagingEmailConnector({
			config: configuration
		});

		const result = await messagingConnector.sendCustomEmail(
			"sender@example.com",
			["receiver1@example.com", "receiver3@example.com", "receiver2@example.com"],
			"Custom Email",
			"<body><h1>Hi, Joe!</h1><p>This is a custom email.</p></body>"
		);
		expect(result).toEqual(true);
	});
});

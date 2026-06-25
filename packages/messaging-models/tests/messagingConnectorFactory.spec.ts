// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { MessagingEmailConnectorFactory } from "../src/factories/messagingEmailConnectorFactory.js";
import { MessagingPushNotificationsConnectorFactory } from "../src/factories/messagingPushNotificationsConnectorFactory.js";
import { MessagingSmsConnectorFactory } from "../src/factories/messagingSmsConnectorFactory.js";
import type { IMessagingEmailConnector } from "../src/models/IMessagingEmailConnector.js";
import type { IMessagingPushNotificationsConnector } from "../src/models/IMessagingPushNotificationsConnector.js";
import type { IMessagingSmsConnector } from "../src/models/IMessagingSmsConnector.js";

describe("MessagingEmailConnectorFactory", () => {
	test("can add an email messaging item to the factory", async () => {
		MessagingEmailConnectorFactory.register(
			"my-messaging-MessagingEmailConnectorFactory",
			() => ({}) as unknown as IMessagingEmailConnector
		);
	});
});

describe("MessagingPushNotificationsConnectorFactory", () => {
	test("can add a push notification messaging item to the factory", async () => {
		MessagingPushNotificationsConnectorFactory.register(
			"my-messaging-MessagingPushNotificationsConnectorFactory",
			() => ({}) as unknown as IMessagingPushNotificationsConnector
		);
	});
});

describe("MessagingSmsConnectorFactory", () => {
	test("can add a sms messaging item to the factory", async () => {
		MessagingSmsConnectorFactory.register(
			"my-messaging-MessagingSmsConnectorFactory",
			() => ({}) as unknown as IMessagingSmsConnector
		);
	});
});

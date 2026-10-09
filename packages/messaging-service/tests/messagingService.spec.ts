// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import {
	MessagingEmailConnectorFactory,
	MessagingPushNotificationsConnectorFactory,
	MessagingSmsConnectorFactory,
	type IMessagingEmailConnector,
	type IMessagingPushNotificationsConnector,
	type IMessagingSmsConnector
} from "@3sixty/messaging-models";
import { nameof } from "@3sixty/nameof";
import type { TemplateEntry } from "../src/entities/templateEntry.js";
import { MessagingAdminService } from "../src/messagingAdminService.js";
import { MessagingService } from "../src/messagingService.js";
import { initSchema } from "../src/schema.js";

let templateStorageMemory: MemoryEntityStorageConnector<TemplateEntry>;

describe("MessagingService", () => {
	beforeEach(() => {
		initSchema();

		ComponentFactory.register("messaging-admin", () => new MessagingAdminService());

		templateStorageMemory = new MemoryEntityStorageConnector<TemplateEntry>({
			entitySchema: nameof<TemplateEntry>(),
			config: { storageKey: "template-entry" }
		});
		EntityStorageConnectorFactory.register("template-entry", () => templateStorageMemory);
	});

	test("Can create an instance", async () => {
		MessagingEmailConnectorFactory.register(
			"messaging-email",
			() => ({}) as unknown as IMessagingEmailConnector
		);
		MessagingPushNotificationsConnectorFactory.register(
			"messaging-push-notification",
			() => ({}) as unknown as IMessagingPushNotificationsConnector
		);
		MessagingSmsConnectorFactory.register(
			"messaging-sms",
			() => ({}) as unknown as IMessagingSmsConnector
		);
		const service = new MessagingService();
		expect(service).toBeDefined();
	});

	test("can construct", async () => {
		const service = new MessagingService();
		expect(service).toBeDefined();
	});

	test("throws error when sending email with invalid sender", async () => {
		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await expect(
			service.sendCustomEmail(
				undefined as unknown as string,
				["recipient@example.com"],
				"templateId",
				{ name: "name" },
				"en"
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
		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await expect(
			service.sendCustomEmail(
				"sender@example.com",
				undefined as unknown as string[],
				"templateId",
				{ name: "name" },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "recipients",
				value: "undefined"
			}
		});
	});

	test("throws error when sending email with invalid templateId", async () => {
		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await expect(
			service.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				undefined as unknown as string,
				{ name: "name" },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "templateId",
				value: "undefined"
			}
		});
	});

	test("throws error when sending email with invalid data", async () => {
		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await expect(
			service.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				"templateId",
				undefined as unknown as { [key: string]: string },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "data",
				value: "undefined"
			}
		});
	});

	test("throws error when sending email with invalid locale", async () => {
		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await expect(
			service.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				"templateId",
				{},
				undefined as unknown as string
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "locale",
				value: "undefined"
			}
		});
	});

	test("throws error when sending an email without defining the Email connector", async () => {
		const service = new MessagingService();
		await expect(
			service.sendCustomEmail(
				"sender@example.com",
				["recipient@example.com"],
				"templateId",
				{ name: "name" },
				"en"
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "messagingService.notConfiguredEmailMessagingConnector"
		});
	});

	test("sends email successfully with valid inputs", async () => {
		MessagingEmailConnectorFactory.register(
			"messaging-email",
			() =>
				({
					sendCustomEmail: async () => true
				}) as unknown as IMessagingEmailConnector
		);

		await templateStorageMemory.set({
			id: "templateId:en",
			dateCreated: new Date(Date.now()).toISOString(),
			title: "Test Title",
			content: "Hello, {{name}}"
		});

		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		const result = await service.sendCustomEmail(
			"sender@example.com",
			["recipient@example.com"],
			"templateId",
			{ name: "name" },
			"en"
		);
		expect(result).toBe(true);
	});

	test("template replacement handles keys containing regex metacharacters", async () => {
		let capturedContent: string | undefined;
		MessagingEmailConnectorFactory.register(
			"messaging-email",
			() =>
				({
					sendCustomEmail: async (
						sender: string,
						recipients: string[],
						subject: string,
						content: string
					) => {
						capturedContent = content;
						return true;
					}
				}) as unknown as IMessagingEmailConnector
		);

		await templateStorageMemory.set({
			id: "templateId:en",
			dateCreated: new Date(Date.now()).toISOString(),
			title: "Order {{order.id}}",
			content: "Price: {{amount(total)}}"
		});

		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		const result = await service.sendCustomEmail(
			"sender@example.com",
			["recipient@example.com"],
			"templateId",
			{ "order.id": "ABC-123", "amount(total)": "42.00" },
			"en"
		);

		expect(result).toBe(true);
		expect(capturedContent).toBe("Price: 42.00");
	});

	test("template replacement value containing $$ is inserted literally", async () => {
		let capturedContent: string | undefined;
		MessagingEmailConnectorFactory.register(
			"messaging-email",
			() =>
				({
					sendCustomEmail: async (
						sender: string,
						recipients: string[],
						subject: string,
						content: string
					) => {
						capturedContent = content;
						return true;
					}
				}) as unknown as IMessagingEmailConnector
		);

		await templateStorageMemory.set({
			id: "templateId:en",
			dateCreated: new Date(Date.now()).toISOString(),
			title: "Hello",
			content: "Cost: {{amount}}"
		});

		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await service.sendCustomEmail(
			"sender@example.com",
			["recipient@example.com"],
			"templateId",
			{ amount: "$$100" },
			"en"
		);

		expect(capturedContent).toBe("Cost: $$100");
	});

	test("template replacement does not match partial placeholders with similar keys", async () => {
		let capturedContent: string | undefined;
		MessagingEmailConnectorFactory.register(
			"messaging-email",
			() =>
				({
					sendCustomEmail: async (
						sender: string,
						recipients: string[],
						subject: string,
						content: string
					) => {
						capturedContent = content;
						return true;
					}
				}) as unknown as IMessagingEmailConnector
		);

		await templateStorageMemory.set({
			id: "templateId:en",
			dateCreated: new Date(Date.now()).toISOString(),
			title: "Hello",
			content: "Dear {{user.name}}, your ref is {{userXname}}"
		});

		const service = new MessagingService({
			messagingEmailConnectorType: "messaging-email"
		});
		await service.sendCustomEmail(
			"sender@example.com",
			["recipient@example.com"],
			"templateId",
			{ "user.name": "Alice" },
			"en"
		);

		expect(capturedContent).toBe("Dear Alice, your ref is {{userXname}}");
	});

	test("throws error when registering device with invalid applicationId", async () => {
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		await expect(
			service.registerDevice(undefined as unknown as string, "deviceToken")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "applicationId",
				value: "undefined"
			}
		});
	});

	test("throws error when registering device with invalid deviceToken", async () => {
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		await expect(
			service.registerDevice("applicationId", undefined as unknown as string)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "deviceToken",
				value: "undefined"
			}
		});
	});

	test("throws error when registering a device without defining the Push Notification connector", async () => {
		const service = new MessagingService();
		await expect(service.registerDevice("applicationId", "deviceToken")).rejects.toMatchObject({
			name: "GeneralError",
			message: "messagingService.notConfiguredPushNotificationMessagingConnector"
		});
	});

	test("registers device successfully with valid inputs", async () => {
		MessagingPushNotificationsConnectorFactory.register(
			"messaging-push-notification",
			() =>
				({
					registerDevice: async () => "deviceRegistered"
				}) as unknown as IMessagingPushNotificationsConnector
		);
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		const result = await service.registerDevice("applicationId", "deviceToken");
		expect(result).toBe("deviceRegistered");
	});

	test("throws error when sending push notification with invalid deviceAddress", async () => {
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		await expect(
			service.sendSinglePushNotification(
				undefined as unknown as string,
				"templateId",
				{ name: "name" },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "deviceAddress",
				value: "undefined"
			}
		});
	});

	test("throws error when sending push notification with invalid templateId", async () => {
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		await expect(
			service.sendSinglePushNotification(
				"deviceAddress",
				undefined as unknown as string,
				{ name: "name" },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "templateId",
				value: "undefined"
			}
		});
	});

	test("throws error when sending push notification with invalid data", async () => {
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		await expect(
			service.sendSinglePushNotification(
				"deviceAddress",
				"templateId",
				undefined as unknown as { [key: string]: string },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "data",
				value: "undefined"
			}
		});
	});

	test("throws error when sending push notification with invalid locale", async () => {
		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		await expect(
			service.sendSinglePushNotification(
				"deviceAddress",
				"templateId",
				{ name: "name" },
				undefined as unknown as string
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "locale",
				value: "undefined"
			}
		});
	});

	test("throws error when sending a push notification without defining the Push Notification connector", async () => {
		const service = new MessagingService();
		await expect(
			service.sendSinglePushNotification("deviceAddress", "templateId", { name: "name" }, "en")
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "messagingService.notConfiguredPushNotificationMessagingConnector"
		});
	});

	test("sends push notification successfully with valid inputs", async () => {
		MessagingPushNotificationsConnectorFactory.register(
			"messaging-push-notification",
			() =>
				({
					sendSinglePushNotification: async () => true
				}) as unknown as IMessagingPushNotificationsConnector
		);

		await templateStorageMemory.set({
			id: "templateId:en",
			dateCreated: new Date(Date.now()).toISOString(),
			title: "Test Title",
			content: "Hello, {{name}}"
		});

		const service = new MessagingService({
			messagingPushNotificationConnectorType: "messaging-push-notification"
		});
		const result = await service.sendSinglePushNotification(
			"deviceAddress",
			"templateId",
			{ name: "name" },
			"en"
		);
		expect(result).toBe(true);
	});

	test("throws error when sending SMS with invalid phoneNumber", async () => {
		const service = new MessagingService({
			messagingSmsConnectorType: "messaging-sms"
		});
		await expect(
			service.sendSMS(undefined as unknown as string, "templateId", { name: "name" }, "en")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "phoneNumber",
				value: "undefined"
			}
		});
	});

	test("throws error when sending SMS with invalid templateId", async () => {
		const service = new MessagingService({
			messagingSmsConnectorType: "messaging-sms"
		});
		await expect(
			service.sendSMS("1234567890", undefined as unknown as string, { name: "name" }, "en")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "templateId",
				value: "undefined"
			}
		});
	});

	test("throws error when sending SMS with invalid data", async () => {
		const service = new MessagingService({
			messagingSmsConnectorType: "messaging-sms"
		});
		await expect(
			service.sendSMS(
				"1234567890",
				"templateId",
				undefined as unknown as { [key: string]: string },
				"en"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "data",
				value: "undefined"
			}
		});
	});

	test("throws error when sending SMS with invalid locale", async () => {
		const service = new MessagingService({
			messagingSmsConnectorType: "messaging-sms"
		});
		await expect(
			service.sendSMS("1234567890", "templateId", { name: "name" }, undefined as unknown as string)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "locale",
				value: "undefined"
			}
		});
	});

	test("throws error when sending SMS without defining the SMS connector", async () => {
		const service = new MessagingService();
		await expect(
			service.sendSMS("1234567890", "templateId", { name: "name" }, "en")
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "messagingService.notConfiguredSmsMessagingConnector"
		});
	});

	test("sends SMS successfully with valid inputs", async () => {
		MessagingSmsConnectorFactory.register(
			"messaging-sms",
			() =>
				({
					sendSMS: async () => true
				}) as unknown as IMessagingSmsConnector
		);

		await templateStorageMemory.set({
			id: "templateId:en",
			dateCreated: new Date(Date.now()).toISOString(),
			title: "Test Title",
			content: "Hello, {{name}}"
		});

		const service = new MessagingService({
			messagingSmsConnectorType: "messaging-sms"
		});
		const result = await service.sendSMS("1234567890", "templateId", { name: "name" }, "en");
		expect(result).toBe(true);
	});
});

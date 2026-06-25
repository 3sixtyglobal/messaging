// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory, GeneralError, Guards, Is } from "@twin.org/core";
import {
	type IMessagingAdminComponent,
	MessagingEmailConnectorFactory,
	MessagingPushNotificationsConnectorFactory,
	MessagingSmsConnectorFactory,
	type IMessagingComponent,
	type IMessagingEmailConnector,
	type IMessagingPushNotificationsConnector,
	type IMessagingSmsConnector
} from "@twin.org/messaging-models";
import { nameof } from "@twin.org/nameof";
import type { IMessagingServiceConstructorOptions } from "./models/IMessagingServiceConstructorOptions.js";

/**
 * Service for dispatching messages via configured email, push notification, and SMS connectors.
 */
export class MessagingService implements IMessagingComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<MessagingService>();

	/**
	 * Emails messaging connector used by the service.
	 * @internal
	 */
	private readonly _emailMessagingConnector?: IMessagingEmailConnector;

	/**
	 * Push notifications messaging connector used by the service.
	 * @internal
	 */
	private readonly _pushNotificationMessagingConnector?: IMessagingPushNotificationsConnector;

	/**
	 * SMS messaging connector used by the service.
	 * @internal
	 */
	private readonly _smsMessagingConnector?: IMessagingSmsConnector;

	/**
	 * The admin component for the messaging.
	 * @internal
	 */
	private readonly _messagingAdminComponent: IMessagingAdminComponent;

	/**
	 * Create a new instance of MessagingService.
	 * @param options The options for the service.
	 */
	constructor(options?: IMessagingServiceConstructorOptions) {
		if (Is.stringValue(options?.messagingEmailConnectorType)) {
			this._emailMessagingConnector = MessagingEmailConnectorFactory.get(
				options.messagingEmailConnectorType
			);
		}

		if (Is.stringValue(options?.messagingPushNotificationConnectorType)) {
			this._pushNotificationMessagingConnector = MessagingPushNotificationsConnectorFactory.get(
				options.messagingPushNotificationConnectorType
			);
		}

		if (Is.stringValue(options?.messagingSmsConnectorType)) {
			this._smsMessagingConnector = MessagingSmsConnectorFactory.get(
				options.messagingSmsConnectorType
			);
		}

		this._messagingAdminComponent = ComponentFactory.get(
			options?.messagingAdminComponentType ?? "messaging-admin"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return MessagingService.CLASS_NAME;
	}

	/**
	 * Send a custom email.
	 * @param sender The sender email address.
	 * @param recipients An array of recipients email addresses.
	 * @param templateId The id of the email template.
	 * @param data The data to populate the email template.
	 * @param locale The locale of the email template.
	 * @returns True if the email was sent successfully.
	 */
	public async sendCustomEmail(
		sender: string,
		recipients: string[],
		templateId: string,
		data: { [key: string]: string },
		locale: string
	): Promise<boolean> {
		if (Is.empty(this._emailMessagingConnector)) {
			throw new GeneralError(MessagingService.CLASS_NAME, "notConfiguredEmailMessagingConnector");
		}

		Guards.stringValue(MessagingService.CLASS_NAME, nameof(sender), sender);
		Guards.arrayValue(MessagingService.CLASS_NAME, nameof(recipients), recipients);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(templateId), templateId);
		Guards.object(MessagingService.CLASS_NAME, nameof(data), data);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(locale), locale);

		const template = await this._messagingAdminComponent.getTemplate(templateId, locale);
		const populatedTemplate = this.populateTemplate(template, data);

		return this._emailMessagingConnector.sendCustomEmail(
			sender,
			recipients,
			populatedTemplate.title,
			populatedTemplate.content
		);
	}

	/**
	 * Registers a device to a specific application in order to send notifications to it.
	 * @param applicationId The application address.
	 * @param deviceToken The device token.
	 * @returns The address assigned to the registered device.
	 */
	public async registerDevice(applicationId: string, deviceToken: string): Promise<string> {
		if (Is.empty(this._pushNotificationMessagingConnector)) {
			throw new GeneralError(
				MessagingService.CLASS_NAME,
				"notConfiguredPushNotificationMessagingConnector"
			);
		}

		Guards.stringValue(MessagingService.CLASS_NAME, nameof(applicationId), applicationId);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(deviceToken), deviceToken);

		return this._pushNotificationMessagingConnector.registerDevice(applicationId, deviceToken);
	}

	/**
	 * Send a push notification to a device.
	 * @param deviceAddress The address of the device.
	 * @param templateId The id of the push notification template.
	 * @param data The data to populate the push notification template.
	 * @param locale The locale of the push notification template.
	 * @returns True if the notification was sent successfully.
	 */
	public async sendSinglePushNotification(
		deviceAddress: string,
		templateId: string,
		data: { [key: string]: string },
		locale: string
	): Promise<boolean> {
		if (Is.empty(this._pushNotificationMessagingConnector)) {
			throw new GeneralError(
				MessagingService.CLASS_NAME,
				"notConfiguredPushNotificationMessagingConnector"
			);
		}

		Guards.stringValue(MessagingService.CLASS_NAME, nameof(deviceAddress), deviceAddress);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(templateId), templateId);
		Guards.object(MessagingService.CLASS_NAME, nameof(data), data);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(locale), locale);

		const template = await this._messagingAdminComponent.getTemplate(templateId, locale);
		const populatedTemplate = this.populateTemplate(template, data);

		return this._pushNotificationMessagingConnector.sendSinglePushNotification(
			deviceAddress,
			populatedTemplate.title,
			populatedTemplate.content
		);
	}

	/**
	 * Send a SMS message to a phone number.
	 * @param phoneNumber The recipient phone number.
	 * @param templateId The id of the SMS template.
	 * @param data The data to populate the SMS template.
	 * @param locale The locale of the SMS template.
	 * @returns True if the SMS was sent successfully.
	 */
	public async sendSMS(
		phoneNumber: string,
		templateId: string,
		data: { [key: string]: string },
		locale: string
	): Promise<boolean> {
		if (Is.empty(this._smsMessagingConnector)) {
			throw new GeneralError(MessagingService.CLASS_NAME, "notConfiguredSmsMessagingConnector");
		}

		Guards.stringValue(MessagingService.CLASS_NAME, nameof(phoneNumber), phoneNumber);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(templateId), templateId);
		Guards.object(MessagingService.CLASS_NAME, nameof(data), data);
		Guards.stringValue(MessagingService.CLASS_NAME, nameof(locale), locale);

		const template = await this._messagingAdminComponent.getTemplate(templateId, locale);
		const populatedTemplate = this.populateTemplate(template, data);

		return this._smsMessagingConnector.sendSMS(phoneNumber, populatedTemplate.content);
	}

	/**
	 * Populates a template by replacing placeholders with the provided data values.
	 * @param template The template.
	 * @param template.title The title of the template.
	 * @param template.content The content of the template.
	 * @param data The data to populate the template.
	 * @returns The template with all placeholders replaced.
	 * @internal
	 */
	private populateTemplate(
		template: { title: string; content: string },
		data: { [key: string]: string }
	): { title: string; content: string } {
		let populatedTitle = template.title;
		let populatedContent = template.content;

		for (const key in data) {
			const value = data[key];
			const placeholder = `{{${key}}}`;
			populatedTitle = populatedTitle.replace(new RegExp(placeholder, "g"), value);
			populatedContent = populatedContent.replace(new RegExp(placeholder, "g"), value);
		}

		return {
			title: populatedTitle,
			content: populatedContent
		};
	}
}

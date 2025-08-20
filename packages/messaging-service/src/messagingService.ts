// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GeneralError, Guards, Is } from "@twin.org/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import {
	MessagingEmailConnectorFactory,
	MessagingPushNotificationsConnectorFactory,
	MessagingSmsConnectorFactory,
	type IMessagingComponent,
	type IMessagingEmailConnector,
	type IMessagingPushNotificationsConnector,
	type IMessagingSmsConnector
} from "@twin.org/messaging-models";
import { nameof } from "@twin.org/nameof";
import { TemplateEntry } from "./entities/templateEntry";
import type { IMessagingServiceConstructorOptions } from "./models/IMessagingServiceConstructorOptions";

/**
 * Service for performing email messaging operations to a connector.
 */
export class MessagingService implements IMessagingComponent {
	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<MessagingService>();

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
	 * Entity storage connector used by the service.
	 * @internal
	 */
	private readonly _entityStorageConnector: IEntityStorageConnector<TemplateEntry>;

	/**
	 * Create a new instance of MessagingService.
	 * @param options The options for the connector.
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

		this._entityStorageConnector = EntityStorageConnectorFactory.get(
			options?.templateEntryStorageConnectorType ?? "template-entry"
		);
	}

	/**
	 * Send a custom email.
	 * @param sender The sender email address.
	 * @param recipients An array of recipients email addresses.
	 * @param templateId The id of the email template.
	 * @param data The data to populate the email template.
	 * @param locale The locale of the email template.
	 * @returns If the email was sent successfully.
	 */
	public async sendCustomEmail(
		sender: string,
		recipients: string[],
		templateId: string,
		data: { [key: string]: string },
		locale: string
	): Promise<boolean> {
		if (Is.empty(this._emailMessagingConnector)) {
			throw new GeneralError(this.CLASS_NAME, "notConfiguredEmailMessagingConnector");
		}

		Guards.stringValue(this.CLASS_NAME, nameof(sender), sender);
		Guards.arrayValue(this.CLASS_NAME, nameof(recipients), recipients);
		Guards.stringValue(this.CLASS_NAME, nameof(templateId), templateId);
		Guards.object(this.CLASS_NAME, nameof(data), data);
		Guards.stringValue(this.CLASS_NAME, nameof(locale), locale);

		const template = await this.getTemplate(templateId, locale);
		const populatedTemplate = this.populateTemplate(template, data);

		return this._emailMessagingConnector.sendCustomEmail(
			sender,
			recipients,
			populatedTemplate.title,
			populatedTemplate.content
		);
	}

	/**
	 * Registers a device to an specific app in order to send notifications to it.
	 * @param applicationId The application address.
	 * @param deviceToken The device token.
	 * @returns If the device was registered successfully.
	 */
	public async registerDevice(applicationId: string, deviceToken: string): Promise<string> {
		if (Is.empty(this._pushNotificationMessagingConnector)) {
			throw new GeneralError(this.CLASS_NAME, "notConfiguredPushNotificationMessagingConnector");
		}

		Guards.stringValue(this.CLASS_NAME, nameof(applicationId), applicationId);
		Guards.stringValue(this.CLASS_NAME, nameof(deviceToken), deviceToken);

		return this._pushNotificationMessagingConnector.registerDevice(applicationId, deviceToken);
	}

	/**
	 * Send a push notification to a device.
	 * @param deviceAddress The address of the device.
	 * @param templateId The id of the push notification template.
	 * @param data The data to populate the push notification template.
	 * @param locale The locale of the push notification template.
	 * @returns If the notification was sent successfully.
	 */
	public async sendSinglePushNotification(
		deviceAddress: string,
		templateId: string,
		data: { [key: string]: string },
		locale: string
	): Promise<boolean> {
		if (Is.empty(this._pushNotificationMessagingConnector)) {
			throw new GeneralError(this.CLASS_NAME, "notConfiguredPushNotificationMessagingConnector");
		}

		Guards.stringValue(this.CLASS_NAME, nameof(deviceAddress), deviceAddress);
		Guards.stringValue(this.CLASS_NAME, nameof(templateId), templateId);
		Guards.object(this.CLASS_NAME, nameof(data), data);
		Guards.stringValue(this.CLASS_NAME, nameof(locale), locale);

		const template = await this.getTemplate(templateId, locale);
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
	 * @returns If the SMS was sent successfully.
	 */
	public async sendSMS(
		phoneNumber: string,
		templateId: string,
		data: { [key: string]: string },
		locale: string
	): Promise<boolean> {
		if (Is.empty(this._smsMessagingConnector)) {
			throw new GeneralError(this.CLASS_NAME, "notConfiguredSmsMessagingConnector");
		}

		Guards.stringValue(this.CLASS_NAME, nameof(phoneNumber), phoneNumber);
		Guards.stringValue(this.CLASS_NAME, nameof(templateId), templateId);
		Guards.object(this.CLASS_NAME, nameof(data), data);
		Guards.stringValue(this.CLASS_NAME, nameof(locale), locale);

		const template = await this.getTemplate(templateId, locale);
		const populatedTemplate = this.populateTemplate(template, data);

		return this._smsMessagingConnector.sendSMS(phoneNumber, populatedTemplate.content);
	}

	/**
	 * Create or update a template.
	 * @param templateId The id of the template.
	 * @param locale The locale of the template.
	 * @param title The title of the template.
	 * @param content The content of the template.
	 * @returns If the template was created or updated successfully.
	 */
	public async createOrUpdateTemplate(
		templateId: string,
		locale: string,
		title: string,
		content: string
	): Promise<boolean> {
		Guards.stringValue(this.CLASS_NAME, nameof(templateId), templateId);
		Guards.stringValue(this.CLASS_NAME, nameof(locale), locale);
		Guards.stringValue(this.CLASS_NAME, nameof(title), title);
		Guards.stringValue(this.CLASS_NAME, nameof(content), content);

		const templateEntry = new TemplateEntry();
		templateEntry.id = `${templateId}:${locale}`;
		templateEntry.dateCreated = new Date(Date.now()).toISOString();
		templateEntry.title = title;
		templateEntry.content = content;

		await this._entityStorageConnector.set(templateEntry);
		return true;
	}

	/**
	 * Get the email template by id and locale.
	 * @param templateId The id of the email template.
	 * @param locale The locale of the email template.
	 * @returns The email template.
	 * @internal
	 */
	private async getTemplate(
		templateId: string,
		locale: string
	): Promise<{ title: string; content: string }> {
		const entityId = `${templateId}:${locale}`;
		const templateInfo = await this._entityStorageConnector.get(entityId);

		if (!templateInfo) {
			throw new GeneralError(this.CLASS_NAME, "getTemplateFailed", { templateId, locale });
		}
		return templateInfo;
	}

	/**
	 * Populate the template with data.
	 * @param template The template.
	 * @param template.title The title of the template.
	 * @param template.content The content of the template.
	 * @param data The data to populate the template.
	 * @internal
	 * @returns The populated template.
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

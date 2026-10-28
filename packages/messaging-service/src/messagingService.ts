// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { BaseError, ComponentFactory, Converter, GeneralError, Guards, Is } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import {
	type IMessagingAdminComponent,
	MessagingEmailConnectorFactory,
	MessagingPushNotificationsConnectorFactory,
	MessagingSmsConnectorFactory,
	type IMessagingComponent,
	type IMessagingEmailConnector,
	type IMessagingPushNotificationsConnector,
	type IMessagingSmsConnector
} from "@3sixty/messaging-models";
import { nameof } from "@3sixty/nameof";
import { FetchHelper, HttpMethod } from "@3sixty/web";
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
	 * Default cache time for fetched style sheets, one hour.
	 * @internal
	 */
	private static readonly _DEFAULT_STYLE_SHEET_CACHE_TTL_MS: number = 3600000;

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
	 * The logging component.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Whether to inline linked style sheets in e-mail templates.
	 * @internal
	 */
	private readonly _inlineStyleSheets: boolean;

	/**
	 * How long fetched style sheets are cached in milliseconds.
	 * @internal
	 */
	private readonly _styleSheetCacheTtlMs: number;

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

		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(options?.loggingComponentType);

		this._inlineStyleSheets = options?.config?.inlineStyleSheets ?? true;
		this._styleSheetCacheTtlMs =
			options?.config?.styleSheetCacheTtlMs ?? MessagingService._DEFAULT_STYLE_SHEET_CACHE_TTL_MS;
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
		const content = this._inlineStyleSheets
			? await this.inlineStyleSheets(templateId, template.content)
			: template.content;
		const populatedTemplate = this.populateTemplate({ title: template.title, content }, data);

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
	 * Replace linked http and https style sheets with inline style elements, leaving any that fail to fetch.
	 * @param templateId The id of the template, used for logging.
	 * @param content The template content.
	 * @returns The content with the style sheets inlined.
	 * @internal
	 */
	private async inlineStyleSheets(templateId: string, content: string): Promise<string> {
		const linkRegex = /<link\b[^>]*>/gi;
		const attributeRegex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<=>`]+))/g;

		const styleSheetLinks = new Map<string, string>();
		for (const linkMatch of content.matchAll(linkRegex)) {
			const attributes: { [name: string]: string } = {};
			for (const attributeMatch of linkMatch[0].matchAll(attributeRegex)) {
				attributes[attributeMatch[1].toLowerCase()] =
					attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4];
			}
			const relTokens = attributes.rel?.toLowerCase().split(/\s+/) ?? [];
			const href = attributes.href?.trim();
			if (relTokens.includes("stylesheet") && Is.stringValue(href) && /^https?:\/\//i.test(href)) {
				styleSheetLinks.set(linkMatch[0], href);
			}
		}

		if (styleSheetLinks.size === 0) {
			return content;
		}

		const styles = new Map<string, string>();
		await Promise.all(
			[...new Set(styleSheetLinks.values())].map(async href => {
				try {
					const css = await FetchHelper.fetchBinary<Uint8Array>(
						MessagingService.CLASS_NAME,
						href,
						HttpMethod.GET,
						undefined,
						{ cacheTtlMs: this._styleSheetCacheTtlMs }
					);
					styles.set(href, Converter.bytesToUtf8(css));
				} catch (err) {
					await this._logging?.log({
						level: "warn",
						source: MessagingService.CLASS_NAME,
						message: "styleSheetFetchFailed",
						error: BaseError.fromError(err),
						data: { href, templateId }
					});
				}
			})
		);

		return content.replace(linkRegex, link => {
			const href = styleSheetLinks.get(link);
			const css = Is.stringValue(href) ? styles.get(href) : undefined;
			return Is.string(css) ? `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : link;
		});
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
			const escapedKey = key.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&");
			const placeholder = new RegExp(`\\{\\{${escapedKey}\\}\\}`, "g");
			populatedTitle = populatedTitle.replace(placeholder, () => value);
			populatedContent = populatedContent.replace(placeholder, () => value);
		}

		return {
			title: populatedTitle,
			content: populatedContent
		};
	}
}

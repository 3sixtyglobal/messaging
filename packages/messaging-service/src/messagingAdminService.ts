// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GeneralError, Guards, Is } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { IMessagingAdminComponent } from "@3sixty/messaging-models";
import { nameof } from "@3sixty/nameof";
import { TemplateEntry } from "./entities/templateEntry.js";
import type { IMessagingAdminServiceConstructorOptions } from "./models/IMessagingAdminServiceConstructorOptions.js";

/**
 * Service for managing message templates stored via entity storage.
 */
export class MessagingAdminService implements IMessagingAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<MessagingAdminService>();

	/**
	 * Default locale for the messaging service.
	 * @internal
	 */
	private static readonly _DEFAULT_LOCALE: string = "en";

	/**
	 * Entity storage connector used by the service.
	 * @internal
	 */
	private readonly _entityStorageConnector: IEntityStorageConnector<TemplateEntry>;

	/**
	 * The default locale to use for the messaging service.
	 * @internal
	 */
	private readonly _defaultLocale: string;

	/**
	 * Create a new instance of MessagingAdminService.
	 * @param options The options for the service.
	 */
	constructor(options?: IMessagingAdminServiceConstructorOptions) {
		this._entityStorageConnector = EntityStorageConnectorFactory.get(
			options?.templateEntryStorageConnectorType ?? "template-entry"
		);

		this._defaultLocale = options?.config?.defaultLocale ?? MessagingAdminService._DEFAULT_LOCALE;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return MessagingAdminService.CLASS_NAME;
	}

	/**
	 * Create or update a template.
	 * @param templateId The id of the template.
	 * @param locale The locale of the template.
	 * @param title The title of the template.
	 * @param content The content of the template.
	 * @returns A promise that resolves when the template has been stored.
	 */
	public async setTemplate(
		templateId: string,
		locale: string,
		title: string,
		content: string
	): Promise<void> {
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(templateId), templateId);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(locale), locale);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(title), title);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(content), content);

		const templateEntry = new TemplateEntry();
		templateEntry.id = `${templateId}:${locale}`;
		templateEntry.dateCreated = new Date(Date.now()).toISOString();
		templateEntry.title = title;
		templateEntry.content = content;

		await this._entityStorageConnector.set(templateEntry);
	}

	/**
	 * Get the email template by id and locale.
	 * @param templateId The id of the email template.
	 * @param locale The locale of the email template.
	 * @returns The email template.
	 */
	public async getTemplate(
		templateId: string,
		locale: string
	): Promise<{ title: string; content: string }> {
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(templateId), templateId);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(locale), locale);

		let templateEntry;

		try {
			// First try to get the template for the requested locale
			templateEntry = await this._entityStorageConnector.get(`${templateId}:${locale}`);
		} catch (err) {
			throw new GeneralError(
				MessagingAdminService.CLASS_NAME,
				"getTemplateFailed",
				{
					templateId,
					locale
				},
				err
			);
		}

		// If the template is not found for the requested locale, try to get it for the default locale
		// only if the requested locale is different from the default locale
		if (Is.empty(templateEntry) && this._defaultLocale !== locale) {
			try {
				templateEntry = await this._entityStorageConnector.get(
					`${templateId}:${this._defaultLocale}`
				);
			} catch (err) {
				throw new GeneralError(
					MessagingAdminService.CLASS_NAME,
					"getTemplateFailed",
					{
						templateId,
						locale: this._defaultLocale
					},
					err
				);
			}
		}

		if (Is.empty(templateEntry)) {
			throw new GeneralError(MessagingAdminService.CLASS_NAME, "getTemplateFailed", {
				templateId,
				locale
			});
		}

		return templateEntry;
	}

	/**
	 * Remove a template.
	 * @param templateId The id of the template.
	 * @param locale The locale of the template.
	 * @returns A promise that resolves when the template has been removed.
	 */
	public async removeTemplate(templateId: string, locale: string): Promise<void> {
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(templateId), templateId);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(locale), locale);

		return this._entityStorageConnector.remove(`${templateId}:${locale}`);
	}
}

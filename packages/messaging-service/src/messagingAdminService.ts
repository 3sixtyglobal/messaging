// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
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
	 * Get the email template by id and locale, or for the locale's language, such as de for de-CH,
	 * or for the default locale when there is none for either.
	 * @param templateId The id of the email template.
	 * @param locale The locale of the email template.
	 * @returns The email template, with the locale of the template found.
	 */
	public async getTemplate(
		templateId: string,
		locale: string
	): Promise<{ title: string; content: string; locale: string }> {
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(templateId), templateId);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(locale), locale);

		const candidates = [...new Set([locale, locale.split("-")[0], this._defaultLocale])];
		for (const candidate of candidates) {
			let templateEntry;
			try {
				templateEntry = await this._entityStorageConnector.get(`${templateId}:${candidate}`);
			} catch (err) {
				throw new GeneralError(
					MessagingAdminService.CLASS_NAME,
					"getTemplateFailed",
					{
						templateId,
						locale: candidate
					},
					err
				);
			}
			if (!Is.empty(templateEntry)) {
				return { title: templateEntry.title, content: templateEntry.content, locale: candidate };
			}
		}

		throw new GeneralError(MessagingAdminService.CLASS_NAME, "getTemplateFailed", {
			templateId,
			locale
		});
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

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GeneralError, Guards, Is } from "@twin.org/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { IMessagingAdminComponent } from "@twin.org/messaging-models";
import { nameof } from "@twin.org/nameof";
import { TemplateEntry } from "./entities/templateEntry";
import type { IMessagingAdminServiceConstructorOptions } from "./models/IMessagingAdminServiceConstructorOptions";

/**
 * Service for performing email messaging operations to a connector.
 */
export class MessagingAdminService implements IMessagingAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<MessagingAdminService>();

	/**
	 * Default locale for the messaging service.
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
	 * Initial set of templates to create on startup.
	 * @internal
	 */
	private readonly _initialTemplates?: {
		templateId: string;
		title: string;
		content: { [locale: string]: string };
	}[];

	/**
	 * Create a new instance of MessagingAdminService.
	 * @param options The options for the connector.
	 */
	constructor(options?: IMessagingAdminServiceConstructorOptions) {
		this._entityStorageConnector = EntityStorageConnectorFactory.get(
			options?.templateEntryStorageConnectorType ?? "template-entry"
		);

		this._defaultLocale = options?.config?.defaultLocale ?? MessagingAdminService._DEFAULT_LOCALE;
		this._initialTemplates = options?.config?.templates;
	}

	/**
	 * The component needs to be started when the node is initialized.
	 * @param nodeIdentity The identity of the node starting the component.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns Nothing.
	 */
	public async start(nodeIdentity?: string, nodeLoggingComponentType?: string): Promise<void> {
		if (Is.arrayValue(this._initialTemplates)) {
			for (const template of this._initialTemplates) {
				for (const locale of Object.keys(template.content)) {
					await this.setTemplate(
						template.templateId,
						locale,
						template.title,
						template.content[locale]
					);
				}
			}
		}
	}

	/**
	 * Create or update a template.
	 * @param templateId The id of the template.
	 * @param locale The locale of the template.
	 * @param title The title of the template.
	 * @param content The content of the template.
	 * @returns Nothing.
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
		} catch {}

		// If the template is not found for the requested locale, try to get it for the default locale
		// only if the requested locale is different from the default locale
		if (Is.empty(templateEntry) && this._defaultLocale !== locale) {
			try {
				templateEntry = await this._entityStorageConnector.get(
					`${templateId}:${this._defaultLocale}`
				);
			} catch {}
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
	 * @returns Nothing
	 */
	public async removeTemplate(templateId: string, locale: string): Promise<void> {
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(templateId), templateId);
		Guards.stringValue(MessagingAdminService.CLASS_NAME, nameof(locale), locale);

		return this._entityStorageConnector.remove(`${templateId}:${locale}`);
	}
}

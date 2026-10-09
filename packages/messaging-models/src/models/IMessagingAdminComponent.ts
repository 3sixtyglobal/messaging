// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";

/**
 * Interface describing the messaging admin component.
 */
export interface IMessagingAdminComponent extends IComponent {
	/**
	 * Create or update a template.
	 * @param templateId The id of the template.
	 * @param locale The locale of the template.
	 * @param title The title of the template.
	 * @param content The content of the template.
	 * @returns A promise that resolves when the template has been stored.
	 */
	setTemplate(templateId: string, locale: string, title: string, content: string): Promise<void>;

	/**
	 * Get the email template by id and locale.
	 * @param templateId The id of the email template.
	 * @param locale The locale of the email template.
	 * @returns The email template.
	 */
	getTemplate(templateId: string, locale: string): Promise<{ title: string; content: string }>;

	/**
	 * Remove a template.
	 * @param templateId The id of the template.
	 * @param locale The locale of the template.
	 * @returns A promise that resolves when the template has been removed.
	 */
	removeTemplate(templateId: string, locale: string): Promise<void>;
}

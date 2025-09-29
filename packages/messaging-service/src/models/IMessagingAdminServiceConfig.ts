// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the messaging service.
 */
export interface IMessagingAdminServiceConfig {
	/**
	 * The default locale to use for the messaging service.
	 * @default en
	 */
	defaultLocale?: string;

	/**
	 * Initial set of templates to create on startup.
	 */
	templates?: {
		templateId: string;
		title: string;
		content: { [locale: string]: string };
	}[];
}

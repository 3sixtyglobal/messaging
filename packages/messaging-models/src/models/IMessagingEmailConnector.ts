// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";

/**
 * Interface describing the email messaging connector functionalities.
 */
export interface IMessagingEmailConnector extends IComponent {
	/**
	 * Send a custom email.
	 * @param sender The sender email address.
	 * @param recipients An array of recipients email addresses.
	 * @param subject The subject of the email.
	 * @param content The html content of the email.
	 * @returns True if the email was sent successfully.
	 */
	sendCustomEmail(
		sender: string,
		recipients: string[],
		subject: string,
		content: string
	): Promise<boolean>;
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";

/**
 * Interface describing the SMS messaging connector functionalities.
 */
export interface IMessagingSmsConnector extends IComponent {
	/**
	 * Send a SMS message to a phone number.
	 * @param phoneNumber The recipient phone number.
	 * @param message The message to send.
	 * @returns True if the SMS was sent successfully.
	 */
	sendSMS(phoneNumber: string, message: string): Promise<boolean>;
}

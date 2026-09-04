// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";

/**
 * Interface describing a consumer that is notified when new emails are available.
 */
export interface IEmailConsumer extends IComponent {
	/**
	 * Called when new emails have been stored, prompting the consumer to query for them.
	 * @returns A promise that resolves when the consumer has processed the notification.
	 */
	onNewMessages(): Promise<void>;
}

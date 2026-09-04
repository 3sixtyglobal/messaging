// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IEmailProtocolConnectorAuthCallback } from "./IEmailProtocolConnectorAuthCallback.js";
import type { IEmailProtocolConnectorRetrievalCallback } from "./IEmailProtocolConnectorRetrievalCallback.js";

/**
 * Interface describing an email protocol connector that handles message retrieval.
 */
export interface IEmailProtocolConnector<TState = unknown> extends IComponent {
	/**
	 * Start the internal polling loop for the given instance.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The current connector state for the instance.
	 * @param authCallback Callback invoked when authentication fails during a poll cycle.
	 * @param retrievalCallback Callback invoked with retrieved messages after each poll cycle.
	 * @returns A promise that resolves when the polling loop has been started.
	 */
	retrieve(
		instanceId: string,
		state: TState,
		authCallback: IEmailProtocolConnectorAuthCallback,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<void>;

	/**
	 * Stop the internal polling loop.
	 * @returns A promise that resolves when the polling loop has been stopped.
	 */
	retrieveStop(): Promise<void>;
}

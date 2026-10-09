// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IEmailProtocolConnectorAuthCallback } from "./IEmailProtocolConnectorAuthCallback.js";
import type { IEmailProtocolConnectorAuthState } from "./IEmailProtocolConnectorAuthState.js";
import type { IEmailProtocolConnectorOptions } from "./IEmailProtocolConnectorOptions.js";
import type { IEmailProtocolConnectorRetrievalCallback } from "./IEmailProtocolConnectorRetrievalCallback.js";

/**
 * Interface describing an email protocol connector that handles message retrieval.
 */
export interface IEmailProtocolConnector<
	TState = unknown,
	TAuthState extends IEmailProtocolConnectorAuthState = IEmailProtocolConnectorAuthState
> extends IComponent {
	/**
	 * Start the internal polling loop for the given instance.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The current connector state for the instance.
	 * @param authCallback Callback invoked when authentication fails during a poll cycle.
	 * @param retrievalCallback Callback invoked with retrieved messages after each poll cycle.
	 * @param options Options supplied by the owning component.
	 * @returns A promise that resolves when the polling loop has been started.
	 */
	retrieve(
		instanceId: string,
		state: TState,
		authCallback: IEmailProtocolConnectorAuthCallback<TAuthState>,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback,
		options: IEmailProtocolConnectorOptions
	): Promise<void>;

	/**
	 * Stop the internal polling loop.
	 * @returns A promise that resolves when the polling loop has been stopped.
	 */
	retrieveStop(): Promise<void>;

	/**
	 * Start an authentication flow for a mailbox before it is polled for the first time.
	 * Only implemented by connectors whose credentials are issued by an external flow, such as
	 * an OAuth consent redirect, so the caller can hand the flow straight to the operator who
	 * created the mailbox rather than waiting for the first poll to report it.
	 * @param instanceId The identifier of the mailbox instance being authenticated.
	 * @param state The current connector state for the instance, which may already hold credentials.
	 * @param options Options supplied by the owning component, carrying the callback URI the flow
	 * must return to and the state which correlates it back to the mailbox.
	 * @returns The auth state carrying the URL to open for the user, or undefined when the
	 * mailbox is already able to authenticate itself.
	 */
	initiateAuth?(
		instanceId: string,
		state: TState,
		options: IEmailProtocolConnectorOptions
	): Promise<TAuthState | undefined>;

	/**
	 * Complete an authentication flow the connector reported through its auth callback.
	 * Only implemented by connectors whose credentials are issued by an external flow, such as
	 * an OAuth consent redirect. The outcome is reported back through the auth callback the
	 * connector was given by retrieve, so nothing is returned here.
	 * @param instanceId The identifier of the mailbox instance being authenticated.
	 * @param authPayload The protocol-specific data handed to the redirect, such as an OAuth code.
	 * @param options Options supplied by the owning component, carrying the same callback URI the
	 * flow was started with.
	 * @returns A promise that resolves when the flow has been completed.
	 */
	completeAuth?(
		instanceId: string,
		authPayload: unknown,
		options: IEmailProtocolConnectorOptions
	): Promise<void>;
}

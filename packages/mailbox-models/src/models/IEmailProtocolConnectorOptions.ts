// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options supplied to a protocol connector by the component which owns it.
 */
export interface IEmailProtocolConnectorOptions {
	/**
	 * The fixed URI an external authentication flow returns to, which correlates the response
	 * back to the mailbox it belongs to. Connectors which start such a flow must send the
	 * external service to this URI rather than one of their own.
	 * Absent when the owning component has no public origin recorded for the mailbox, which
	 * leaves a connector able to poll with the credentials it has but unable to start a flow.
	 */
	callbackUri?: string;

	/**
	 * The opaque value a connector must carry through an external authentication flow so the
	 * response returns to the owning component identifying both the partition and the mailbox.
	 * It is passed back verbatim, so the component needs no search to correlate the callback.
	 */
	correlationState: string;
}

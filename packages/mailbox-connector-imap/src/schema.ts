// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory
} from "@twin.org/mailbox-models";
import { ImapEmailConnectorConfigSchema } from "./connectorSchema/imapEmailConnectorConfigSchema.js";
import { ImapEmailConnectorStateSchema } from "./connectorSchema/imapEmailConnectorStateSchema.js";
import { ImapEmailConnector } from "./imapEmailConnector.js";

/**
 * Initialise the connector schemas for the IMAP connector.
 * The connector constructor calls this as well, so registering here is only needed to make the
 * schemas available before any connector instance has been built, such as for a mailbox which
 * is stored but not currently polled.
 */
export function initSchema(): void {
	EmailProtocolConnectorConfigSchemaFactory.register(
		ImapEmailConnector.NAMESPACE,
		() => ImapEmailConnectorConfigSchema
	);
	EmailProtocolConnectorStateSchemaFactory.register(
		ImapEmailConnector.NAMESPACE,
		() => ImapEmailConnectorStateSchema
	);
}

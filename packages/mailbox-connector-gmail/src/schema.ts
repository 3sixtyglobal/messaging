// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory
} from "@twin.org/mailbox-models";
import { GmailEmailConnectorConfigSchema } from "./connectorSchema/gmailEmailConnectorConfigSchema.js";
import { GmailEmailConnectorStateSchema } from "./connectorSchema/gmailEmailConnectorStateSchema.js";
import { GmailEmailConnector } from "./gmailEmailConnector.js";

/**
 * Initialise the connector schemas for the Gmail connector.
 * The connector constructor calls this as well, so registering here is only needed to make the
 * schemas available before any connector instance has been built, such as for a mailbox which
 * is stored but not currently polled.
 */
export function initSchema(): void {
	EmailProtocolConnectorConfigSchemaFactory.register(
		GmailEmailConnector.NAMESPACE,
		() => GmailEmailConnectorConfigSchema
	);
	EmailProtocolConnectorStateSchemaFactory.register(
		GmailEmailConnector.NAMESPACE,
		() => GmailEmailConnectorStateSchema
	);
}

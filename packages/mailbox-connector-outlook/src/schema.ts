// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory
} from "@twin.org/mailbox-models";
import { OutlookEmailConnectorConfigSchema } from "./connectorSchema/outlookEmailConnectorConfigSchema.js";
import { OutlookEmailConnectorStateSchema } from "./connectorSchema/outlookEmailConnectorStateSchema.js";
import { OutlookEmailConnector } from "./outlookEmailConnector.js";

/**
 * Initialise the connector schemas for the Outlook connector.
 * The connector constructor calls this as well, so registering here is only needed to make the
 * schemas available before any connector instance has been built, such as for a mailbox which
 * is stored but not currently polled.
 */
export function initSchema(): void {
	EmailProtocolConnectorConfigSchemaFactory.register(
		OutlookEmailConnector.NAMESPACE,
		() => OutlookEmailConnectorConfigSchema
	);
	EmailProtocolConnectorStateSchemaFactory.register(
		OutlookEmailConnector.NAMESPACE,
		() => OutlookEmailConnectorStateSchema
	);
}

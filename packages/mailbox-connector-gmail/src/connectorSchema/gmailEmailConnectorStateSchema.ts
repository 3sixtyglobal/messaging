// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@3sixty/entity";
import type { IMailboxConfigField } from "@3sixty/mailbox-models";

/**
 * The runtime state field schema for Gmail connectors.
 * The refresh token is issued by the consent flow rather than configured, so it travels in the
 * connector state and is marked secure to keep it in the vault.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GmailEmailConnectorStateSchema: IMailboxConfigField[] = [
	{
		labelKey: "gmailEmailConnectorStateSchema.refreshToken",
		propertyKey: "refreshToken",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "gmailEmailConnectorStateSchema.historyId",
		propertyKey: "historyId",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "gmailEmailConnectorStateSchema.syncPageTokens",
		propertyKey: "syncPageTokens",
		type: EntitySchemaPropertyType.Object
	},
	{
		labelKey: "gmailEmailConnectorStateSchema.syncCompletedLabelIds",
		propertyKey: "syncCompletedLabelIds",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String
	},
	{
		labelKey: "gmailEmailConnectorStateSchema.initialSyncComplete",
		propertyKey: "initialSyncComplete",
		type: EntitySchemaPropertyType.Boolean
	},
	{
		labelKey: "gmailEmailConnectorStateSchema.deliveredMessageIds",
		propertyKey: "deliveredMessageIds",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String
	}
];

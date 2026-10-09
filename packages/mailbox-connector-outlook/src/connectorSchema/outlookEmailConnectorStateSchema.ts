// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@3sixty/entity";
import type { IMailboxConfigField } from "@3sixty/mailbox-models";

/**
 * The runtime state field schema for Outlook connectors.
 * The token cache is filled by the consent flow rather than configured, so it travels in the
 * connector state and is marked secure to keep the refresh token it holds in the vault.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OutlookEmailConnectorStateSchema: IMailboxConfigField[] = [
	{
		labelKey: "outlookEmailConnectorStateSchema.tokenCache",
		propertyKey: "tokenCache",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.accountId",
		propertyKey: "accountId",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.deltaLinks",
		propertyKey: "deltaLinks",
		type: EntitySchemaPropertyType.Object
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.syncNextLinks",
		propertyKey: "syncNextLinks",
		type: EntitySchemaPropertyType.Object
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.syncCompletedFolderIds",
		propertyKey: "syncCompletedFolderIds",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.syncFromDateTime",
		propertyKey: "syncFromDateTime",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.initialSyncComplete",
		propertyKey: "initialSyncComplete",
		type: EntitySchemaPropertyType.Boolean
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.lastReceivedDateTime",
		propertyKey: "lastReceivedDateTime",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorStateSchema.deliveredMessageIds",
		propertyKey: "deliveredMessageIds",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String
	}
];

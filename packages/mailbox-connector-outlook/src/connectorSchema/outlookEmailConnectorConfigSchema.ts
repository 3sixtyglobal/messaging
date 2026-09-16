// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@twin.org/entity";
import type { IMailboxConfigField } from "@twin.org/mailbox-models";

/**
 * The configuration field schema for Outlook connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OutlookEmailConnectorConfigSchema: IMailboxConfigField[] = [
	{
		labelKey: "outlookEmailConnectorConfigSchema.emailAddress",
		propertyKey: "emailAddress",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.tenantId",
		propertyKey: "tenantId",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.clientId",
		propertyKey: "clientId",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.clientSecret",
		propertyKey: "clientSecret",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.clientCertificate",
		propertyKey: "clientCertificate",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.appOnlyAccess",
		propertyKey: "appOnlyAccess",
		type: EntitySchemaPropertyType.Boolean,
		defaultValue: false
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.folderIds",
		propertyKey: "folderIds",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String,
		defaultValue: ["inbox"]
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.maxMessagesPerPoll",
		propertyKey: "maxMessagesPerPoll",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 50
	},
	{
		labelKey: "outlookEmailConnectorConfigSchema.pollingIntervalMinutes",
		propertyKey: "pollingIntervalMinutes",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 2
	}
];

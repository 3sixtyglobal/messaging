// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@twin.org/entity";
import type { IMailboxConfigField } from "@twin.org/mailbox-models";

/**
 * The configuration field schema for Gmail connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GmailEmailConnectorConfigSchema: IMailboxConfigField[] = [
	{
		labelKey: "gmailEmailConnectorConfigSchema.emailAddress",
		propertyKey: "emailAddress",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "gmailEmailConnectorConfigSchema.clientId",
		propertyKey: "clientId",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "gmailEmailConnectorConfigSchema.clientSecret",
		propertyKey: "clientSecret",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "gmailEmailConnectorConfigSchema.serviceAccountKey",
		propertyKey: "serviceAccountKey",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "gmailEmailConnectorConfigSchema.labelIds",
		propertyKey: "labelIds",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String,
		defaultValue: ["INBOX"]
	},
	{
		labelKey: "gmailEmailConnectorConfigSchema.maxMessagesPerPoll",
		propertyKey: "maxMessagesPerPoll",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 50
	},
	{
		labelKey: "gmailEmailConnectorConfigSchema.pollingIntervalMinutes",
		propertyKey: "pollingIntervalMinutes",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 2
	}
];

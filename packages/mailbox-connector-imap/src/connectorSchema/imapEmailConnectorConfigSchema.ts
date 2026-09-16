// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@twin.org/entity";
import type { IMailboxConfigField } from "@twin.org/mailbox-models";

/**
 * The configuration field schema for IMAP connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ImapEmailConnectorConfigSchema: IMailboxConfigField[] = [
	{
		labelKey: "imapEmailConnectorConfigSchema.host",
		propertyKey: "host",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "imapEmailConnectorConfigSchema.port",
		propertyKey: "port",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 993
	},
	{
		labelKey: "imapEmailConnectorConfigSchema.secure",
		propertyKey: "secure",
		type: EntitySchemaPropertyType.Boolean,
		defaultValue: true
	},
	{
		labelKey: "imapEmailConnectorConfigSchema.username",
		propertyKey: "username",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "imapEmailConnectorConfigSchema.password",
		propertyKey: "password",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "imapEmailConnectorConfigSchema.folders",
		propertyKey: "folders",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String,
		defaultValue: ["INBOX"]
	},
	{
		labelKey: "imapEmailConnectorConfigSchema.pollingIntervalMinutes",
		propertyKey: "pollingIntervalMinutes",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 2
	}
];

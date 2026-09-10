// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@twin.org/entity";
import type { IMailboxConfigField } from "@twin.org/mailbox-models";

/**
 * The configuration field schema for POP3 connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Pop3EmailConnectorConfigSchema: IMailboxConfigField[] = [
	{
		labelKey: "pop3EmailConnectorConfigSchema.host",
		propertyKey: "host",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "pop3EmailConnectorConfigSchema.port",
		propertyKey: "port",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 110
	},
	{
		labelKey: "pop3EmailConnectorConfigSchema.secure",
		propertyKey: "secure",
		type: EntitySchemaPropertyType.Boolean,
		defaultValue: false
	},
	{
		labelKey: "pop3EmailConnectorConfigSchema.username",
		propertyKey: "username",
		type: EntitySchemaPropertyType.String
	},
	{
		labelKey: "pop3EmailConnectorConfigSchema.password",
		propertyKey: "password",
		type: EntitySchemaPropertyType.String,
		isSecure: true
	},
	{
		labelKey: "pop3EmailConnectorConfigSchema.pollingIntervalMinutes",
		propertyKey: "pollingIntervalMinutes",
		type: EntitySchemaPropertyType.Integer,
		defaultValue: 2
	},
	{
		labelKey: "pop3EmailConnectorConfigSchema.retainMessages",
		propertyKey: "retainMessages",
		type: EntitySchemaPropertyType.Boolean,
		defaultValue: true
	}
];

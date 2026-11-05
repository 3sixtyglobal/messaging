// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@3sixty/entity";
import type { IMailboxConfigField } from "@3sixty/mailbox-models";

/**
 * The runtime state field schema for IMAP connectors.
 * The connector authenticates with its configured credentials, so no state property is secure.
 */
export const ImapEmailConnectorStateSchema: IMailboxConfigField[] = [
	{
		labelKey: "imapEmailConnectorStateSchema.folders",
		propertyKey: "folders",
		type: EntitySchemaPropertyType.Object
	}
];

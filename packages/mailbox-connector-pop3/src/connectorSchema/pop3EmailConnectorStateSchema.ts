// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaPropertyType } from "@3sixty/entity";
import type { IMailboxConfigField } from "@3sixty/mailbox-models";

/**
 * The runtime state field schema for POP3 connectors.
 * The connector authenticates with its configured credentials, so no state property is secure.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Pop3EmailConnectorStateSchema: IMailboxConfigField[] = [
	{
		labelKey: "pop3EmailConnectorStateSchema.seenUidls",
		propertyKey: "seenUidls",
		type: EntitySchemaPropertyType.Array,
		itemType: EntitySchemaPropertyType.String
	}
];

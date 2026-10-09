// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { Mailbox } from "./entities/mailbox.js";
import { StoredEmail } from "./entities/storedEmail.js";

/**
 * Initialise the entity schemas for the mailbox service.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<Mailbox>(), () => EntitySchemaHelper.getSchema(Mailbox));
	EntitySchemaFactory.register(nameof<StoredEmail>(), () =>
		EntitySchemaHelper.getSchema(StoredEmail)
	);
}

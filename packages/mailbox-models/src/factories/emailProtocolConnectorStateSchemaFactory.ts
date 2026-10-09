// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IMailboxConfigField } from "../models/IMailboxConfigField.js";

/**
 * Factory for retrieving email protocol connector state field definitions.
 * Only the properties a connector holds in its runtime state need registering here, and the ones
 * marked secure are stored in the vault instead of alongside the rest of the state.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmailProtocolConnectorStateSchemaFactory = Factory.createFactory<
	IMailboxConfigField[]
>("email-protocol-state-schema");

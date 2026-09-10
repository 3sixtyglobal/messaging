// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@twin.org/core";
import type { IMailboxConfigField } from "../models/IMailboxConfigField.js";

/**
 * Factory for retrieving email protocol connector configuration field definitions.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmailProtocolConnectorConfigSchemaFactory = Factory.createFactory<
	IMailboxConfigField[]
>("email-protocol-config-schema");

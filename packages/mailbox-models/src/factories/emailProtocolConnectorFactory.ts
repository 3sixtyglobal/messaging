// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IEmailProtocolConnector } from "../models/IEmailProtocolConnector.js";

/**
 * Factory for creating email protocol connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmailProtocolConnectorFactory =
	Factory.createFactory<IEmailProtocolConnector>("email-protocol");

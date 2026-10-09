// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IMessagingEmailConnector } from "../models/IMessagingEmailConnector.js";

/**
 * Factory for creating messaging email connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MessagingEmailConnectorFactory =
	Factory.createFactory<IMessagingEmailConnector>("messaging-email");

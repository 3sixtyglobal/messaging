// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IMessagingSmsConnector } from "../models/IMessagingSmsConnector.js";

/**
 * Factory for creating messaging sms connectors.
 */
export const MessagingSmsConnectorFactory =
	Factory.createFactory<IMessagingSmsConnector>("messaging-sms");

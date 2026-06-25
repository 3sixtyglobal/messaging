// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@twin.org/core";
import type { IMessagingSmsConnector } from "../models/IMessagingSmsConnector.js";

/**
 * Factory for creating messaging sms connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MessagingSmsConnectorFactory =
	Factory.createFactory<IMessagingSmsConnector>("messaging-sms");

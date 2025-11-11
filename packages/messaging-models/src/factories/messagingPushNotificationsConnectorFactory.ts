// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@twin.org/core";
import type { IMessagingPushNotificationsConnector } from "../models/IMessagingPushNotificationsConnector.js";

/**
 * Factory for creating messaging push notification connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MessagingPushNotificationsConnectorFactory =
	Factory.createFactory<IMessagingPushNotificationsConnector>("messaging-push-notifications");

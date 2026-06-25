// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { EmailEntry } from "./entities/emailEntry.js";
import { PushNotificationDeviceEntry } from "./entities/pushNotificationDeviceEntry.js";
import { PushNotificationMessageEntry } from "./entities/pushNotificationMessageEntry.js";
import { SmsEntry } from "./entities/smsEntry.js";

/**
 * Registers entity schemas required by the messaging entity-storage connector.
 * @param options Controls which schema groups are registered.
 * @param options.email Whether to register email schemas.
 * @param options.sms Whether to register SMS schemas.
 * @param options.pushNotification Whether to register push notification schemas.
 */
export function initSchema(options?: {
	email?: boolean;
	sms?: boolean;
	pushNotification?: boolean;
}): void {
	if (options?.email ?? true) {
		EntitySchemaFactory.register(nameof<EmailEntry>(), () =>
			EntitySchemaHelper.getSchema(EmailEntry)
		);
	}

	if (options?.pushNotification ?? true) {
		EntitySchemaFactory.register(nameof<PushNotificationDeviceEntry>(), () =>
			EntitySchemaHelper.getSchema(PushNotificationDeviceEntry)
		);
		EntitySchemaFactory.register(nameof<PushNotificationMessageEntry>(), () =>
			EntitySchemaHelper.getSchema(PushNotificationMessageEntry)
		);
	}

	if (options?.sms ?? true) {
		EntitySchemaFactory.register(nameof<SmsEntry>(), () => EntitySchemaHelper.getSchema(SmsEntry));
	}
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { EmailEntry } from "./entities/emailEntry.js";
import { PushNotificationDeviceEntry } from "./entities/pushNotificationDeviceEntry.js";
import { PushNotificationMessageEntry } from "./entities/pushNotificationMessageEntry.js";
import { SmsEntry } from "./entities/smsEntry.js";

/**
 * Initialize the schema for the messaging connector entity storage.
 * @param options The options for the initialisation.
 * @param options.email Should we register email schemas.
 * @param options.sms Should we register sms schemas.
 * @param options.pushNotification Should we register push notification schemas.
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

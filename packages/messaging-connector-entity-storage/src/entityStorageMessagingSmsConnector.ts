// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory, Converter, GeneralError, Guards, RandomHelper } from "@twin.org/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type { IMessagingSmsConnector } from "@twin.org/messaging-models";
import { nameof, nameofKebabCase } from "@twin.org/nameof";
import type { SmsEntry } from "./entities/smsEntry.js";
import type { IEntityStorageMessagingSmsConnectorConstructorOptions } from "./models/IEntityStorageMessagingSmsConnectorConstructorOptions.js";

/**
 * Class for connecting to the SMS messaging operations of the Entity Storage.
 */
export class EntityStorageMessagingSmsConnector implements IMessagingSmsConnector {
	/**
	 * The namespace for the connector.
	 */
	public static readonly NAMESPACE: string = "entity-storage";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageMessagingSmsConnector>();

	/**
	 * The logging component.
	 * @internal
	 */
	protected readonly _logging?: ILoggingComponent;

	/**
	 * The entity storage for the sms entries.
	 * @internal
	 */
	private readonly _messagingSmsEntryStorage: IEntityStorageConnector<SmsEntry>;

	/**
	 * Create a new instance of EntityStorageMessagingSmsConnector.
	 * @param options The options for the connector.
	 */
	constructor(options?: IEntityStorageMessagingSmsConnectorConstructorOptions) {
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType ?? "logging");
		this._messagingSmsEntryStorage = EntityStorageConnectorFactory.get(
			options?.messagingSmsEntryStorageConnectorType ?? nameofKebabCase<SmsEntry>()
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageMessagingSmsConnector.CLASS_NAME;
	}

	/**
	 * Send a SMS message to a phone number.
	 * @param phoneNumber The recipient phone number.
	 * @param message The message to send.
	 * @returns If the SMS was sent successfully.
	 */
	public async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
		Guards.stringValue(
			EntityStorageMessagingSmsConnector.CLASS_NAME,
			nameof(phoneNumber),
			phoneNumber
		);
		Guards.stringValue(EntityStorageMessagingSmsConnector.CLASS_NAME, nameof(message), message);
		try {
			await this._logging?.log({
				level: "info",
				source: EntityStorageMessagingSmsConnector.CLASS_NAME,
				ts: Date.now(),
				message: "smsSending"
			});

			const id = Converter.bytesToHex(RandomHelper.generate(32));

			const entity: SmsEntry = {
				id,
				phoneNumber,
				message,
				ts: Date.now(),
				status: "sent"
			};

			await this._messagingSmsEntryStorage.set(entity);

			return true;
		} catch (err) {
			throw new GeneralError(
				EntityStorageMessagingSmsConnector.CLASS_NAME,
				"sendSMSFailed",
				undefined,
				err
			);
		}
	}
}

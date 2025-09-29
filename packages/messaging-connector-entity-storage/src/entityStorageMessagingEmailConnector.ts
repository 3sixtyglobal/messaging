// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory, Converter, GeneralError, Guards, RandomHelper } from "@twin.org/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type { IMessagingEmailConnector } from "@twin.org/messaging-models";
import { nameof, nameofKebabCase } from "@twin.org/nameof";
import type { EmailEntry } from "./entities/emailEntry";
import type { IEntityStorageMessagingEmailConnectorConstructorOptions } from "./models/IEntityStorageMessagingEmailConnectorConstructorOptions";

/**
 * Class for connecting to the email messaging operations of the Entity Storage.
 */
export class EntityStorageMessagingEmailConnector implements IMessagingEmailConnector {
	/**
	 * The namespace for the connector.
	 */
	public static readonly NAMESPACE: string = "entity-storage";

	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<EntityStorageMessagingEmailConnector>();

	/**
	 * The logging component.
	 * @internal
	 */
	protected readonly _logging?: ILoggingComponent;

	/**
	 * The entity storage for the emails entries.
	 * @internal
	 */
	private readonly _messagingEmailEntryStorage: IEntityStorageConnector<EmailEntry>;

	/**
	 * Create a new instance of EntityStorageMessagingEmailConnector.
	 * @param options The options for the connector.
	 */
	constructor(options?: IEntityStorageMessagingEmailConnectorConstructorOptions) {
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType ?? "logging");
		this._messagingEmailEntryStorage = EntityStorageConnectorFactory.get(
			options?.messagingEmailEntryStorageConnectorType ?? nameofKebabCase<EmailEntry>()
		);
	}

	/**
	 * Store a custom email using Entity Storage.
	 * @param sender The sender email address.
	 * @param recipients An array of recipients email addresses.
	 * @param subject The subject of the email.
	 * @param content The html content of the email.
	 * @returns True if the email was send successfully, otherwise undefined.
	 */
	public async sendCustomEmail(
		sender: string,
		recipients: string[],
		subject: string,
		content: string
	): Promise<boolean> {
		Guards.stringValue(this.CLASS_NAME, nameof(sender), sender);
		Guards.arrayValue(this.CLASS_NAME, nameof(recipients), recipients);
		Guards.stringValue(this.CLASS_NAME, nameof(subject), subject);
		Guards.stringValue(this.CLASS_NAME, nameof(content), content);
		try {
			await this._logging?.log({
				level: "info",
				source: this.CLASS_NAME,
				ts: Date.now(),
				message: "emailSending",
				data: {
					type: "Custom Email"
				}
			});

			const id = Converter.bytesToHex(RandomHelper.generate(32));

			const entity: EmailEntry = {
				id,
				sender,
				recipients,
				ts: Date.now(),
				message: content,
				subject,
				status: "pending"
			};

			await this._messagingEmailEntryStorage.set(entity);

			return true;
		} catch (err) {
			throw new GeneralError(this.CLASS_NAME, "sendCustomEmailFailed", undefined, err);
		}
	}
}

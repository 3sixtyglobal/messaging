// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ComponentFactory, GeneralError, Guards, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type { IMessagingEmailConnector } from "@twin.org/messaging-models";
import { nameof } from "@twin.org/nameof";
import { createTransport } from "nodemailer";
import type { ISmtpMessagingEmailConnectorConstructorOptions } from "./models/ISmtpMessagingEmailConnectorConstructorOptions.js";

/**
 * Class for connecting to the email messaging operations of an SMTP server.
 */
export class SmtpMessagingEmailConnector implements IMessagingEmailConnector {
	/**
	 * The namespace for the connector.
	 */
	public static readonly NAMESPACE: string = "smtp";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<SmtpMessagingEmailConnector>();

	/**
	 * The logging component.
	 * @internal
	 */
	protected readonly _logging?: ILoggingComponent;

	/**
	 * The nodemailer transporter.
	 * @internal
	 */
	private readonly _transporter: ReturnType<typeof createTransport>;

	/**
	 * Create a new instance of SmtpMessagingEmailConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: ISmtpMessagingEmailConnectorConstructorOptions) {
		Guards.object(SmtpMessagingEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.object(SmtpMessagingEmailConnector.CLASS_NAME, nameof(options.config), options.config);
		Guards.stringValue(
			SmtpMessagingEmailConnector.CLASS_NAME,
			nameof(options.config.host),
			options.config.host
		);

		this._logging = ComponentFactory.getIfExists(options.loggingComponentType);

		this._transporter = createTransport({
			host: options.config.host,
			port: options.config.port ?? 587,
			secure: options.config.secure ?? false,
			auth:
				Is.stringValue(options.config.username) && Is.stringValue(options.config.password)
					? {
							user: options.config.username,
							pass: options.config.password
						}
					: undefined
		});
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return SmtpMessagingEmailConnector.CLASS_NAME;
	}

	/**
	 * Send a custom email using SMTP.
	 * @param sender The sender email address.
	 * @param recipients An array of recipient email addresses.
	 * @param subject The subject of the email.
	 * @param content The html content of the email.
	 * @returns True if the email was sent successfully.
	 */
	public async sendCustomEmail(
		sender: string,
		recipients: string[],
		subject: string,
		content: string
	): Promise<boolean> {
		Guards.stringValue(SmtpMessagingEmailConnector.CLASS_NAME, nameof(sender), sender);
		Guards.arrayValue(SmtpMessagingEmailConnector.CLASS_NAME, nameof(recipients), recipients);
		Guards.stringValue(SmtpMessagingEmailConnector.CLASS_NAME, nameof(subject), subject);
		Guards.stringValue(SmtpMessagingEmailConnector.CLASS_NAME, nameof(content), content);
		try {
			await this._logging?.log({
				level: "info",
				source: SmtpMessagingEmailConnector.CLASS_NAME,
				ts: Date.now(),
				message: "emailSending",
				data: {
					subject
				}
			});

			await this._transporter.sendMail({
				from: sender,
				to: recipients,
				subject,
				html: content
			});

			return true;
		} catch (err) {
			throw new GeneralError(
				SmtpMessagingEmailConnector.CLASS_NAME,
				"sendCustomEmailFailed",
				undefined,
				err
			);
		}
	}
}

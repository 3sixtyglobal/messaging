// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses";
import { ComponentFactory, GeneralError, Guards, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type { IMessagingEmailConnector } from "@twin.org/messaging-models";
import { nameof } from "@twin.org/nameof";
import { HttpStatusCode } from "@twin.org/web";
import type { IAwsEmailConnectorConfig } from "./models/IAwsEmailConnectorConfig.js";
import type { IAwsMessagingEmailConnectorConstructorOptions } from "./models/IAwsMessagingEmailConnectorConstructorOptions.js";

/**
 * Class for connecting to the email messaging operations of the AWS services.
 */
export class AwsMessagingEmailConnector implements IMessagingEmailConnector {
	/**
	 * The namespace for the connector.
	 */
	public static readonly NAMESPACE: string = "aws";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AwsMessagingEmailConnector>();

	/**
	 * The logging component.
	 * @internal
	 */
	protected readonly _logging?: ILoggingComponent;

	/**
	 * The configuration for the client connector.
	 * @internal
	 */
	private readonly _config: IAwsEmailConnectorConfig;

	/**
	 * The Aws SES client.
	 * @internal
	 */
	private readonly _client: SESClient;

	/**
	 * Create a new instance of AwsMessagingEmailConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IAwsMessagingEmailConnectorConstructorOptions) {
		Guards.object(AwsMessagingEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.object<IAwsEmailConnectorConfig>(
			AwsMessagingEmailConnector.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			AwsMessagingEmailConnector.CLASS_NAME,
			nameof(options.config.region),
			options.config.region
		);

		options.config.authMode ??= "credentials";

		let credentials;
		if (options.config.authMode === "credentials") {
			Guards.stringValue(
				AwsMessagingEmailConnector.CLASS_NAME,
				nameof(options.config.accessKeyId),
				options.config.accessKeyId
			);
			Guards.stringValue(
				AwsMessagingEmailConnector.CLASS_NAME,
				nameof(options.config.secretAccessKey),
				options.config.secretAccessKey
			);
			credentials = {
				accessKeyId: options.config.accessKeyId,
				secretAccessKey: options.config.secretAccessKey
			};
		}

		this._logging = ComponentFactory.getIfExists(options.loggingComponentType ?? "logging");

		this._config = options.config;
		this._config.endpoint = Is.stringValue(this._config.endpoint)
			? this._config.endpoint
			: undefined;
		this._client = new SESClient({
			endpoint: this._config.endpoint,
			region: this._config.region,
			credentials
		});
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AwsMessagingEmailConnector.CLASS_NAME;
	}

	/**
	 * Send a custom email using AWS SES.
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
		Guards.stringValue(AwsMessagingEmailConnector.CLASS_NAME, nameof(sender), sender);
		Guards.arrayValue(AwsMessagingEmailConnector.CLASS_NAME, nameof(recipients), recipients);
		Guards.stringValue(AwsMessagingEmailConnector.CLASS_NAME, nameof(subject), subject);
		Guards.stringValue(AwsMessagingEmailConnector.CLASS_NAME, nameof(content), content);
		try {
			await this._logging?.log({
				level: "info",
				source: AwsMessagingEmailConnector.CLASS_NAME,
				ts: Date.now(),
				message: "emailSending",
				data: {
					type: "Custom Email"
				}
			});
			const result = await this._client.send(
				new SendEmailCommand({
					Destination: { ToAddresses: recipients },
					Message: {
						Subject: {
							Data: subject
						},
						Body: {
							Html: {
								Data: content
							}
						}
					},
					Source: sender
				})
			);
			if (result.$metadata.httpStatusCode !== HttpStatusCode.ok) {
				await this._logging?.log({
					level: "error",
					source: AwsMessagingEmailConnector.CLASS_NAME,
					ts: Date.now(),
					message: "sendCustomEmailFailed"
				});
				throw new GeneralError(
					AwsMessagingEmailConnector.CLASS_NAME,
					"sendCustomEmailFailed",
					undefined,
					result
				);
			}
			return true;
		} catch (err) {
			throw new GeneralError(
				AwsMessagingEmailConnector.CLASS_NAME,
				"sendCustomEmailFailed",
				undefined,
				err
			);
		}
	}

	/**
	 * Verify an email address using AWS SES.
	 * @param emailAddress The email address to verify.
	 */
	public async verifyEmailAddress(emailAddress: string): Promise<void> {
		const command = new VerifyEmailIdentityCommand({ EmailAddress: emailAddress });
		await this._client.send(command);
	}
}

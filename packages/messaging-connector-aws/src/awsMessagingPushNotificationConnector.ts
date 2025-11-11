// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	CreatePlatformApplicationCommand,
	CreatePlatformEndpointCommand,
	ListEndpointsByPlatformApplicationCommand,
	type ListEndpointsByPlatformApplicationResponse,
	ListPlatformApplicationsCommand,
	PublishCommand,
	SNSClient
} from "@aws-sdk/client-sns";
import { ComponentFactory, GeneralError, Guards, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type { IMessagingPushNotificationsConnector } from "@twin.org/messaging-models";
import { nameof } from "@twin.org/nameof";
import { HttpStatusCode } from "@twin.org/web";
import type { IAwsMessagingPushNotificationConnectorConstructorOptions } from "./models/IAwsMessagingPushNotificationConnectorConstructorOptions.js";
import type { IAwsPushNotificationConnectorConfig } from "./models/IAwsPushNotificationConnectorConfig.js";

/**
 * Class for connecting to the push notifications messaging operations of the AWS services.
 */
export class AwsMessagingPushNotificationConnector implements IMessagingPushNotificationsConnector {
	/**
	 * The namespace for the connector.
	 */
	public static readonly NAMESPACE: string = "aws";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AwsMessagingPushNotificationConnector>();

	/**
	 * The logging component.
	 * @internal
	 */
	protected readonly _logging?: ILoggingComponent;

	/**
	 * The configuration for the client connector.
	 * @internal
	 */
	private readonly _config: IAwsPushNotificationConnectorConfig;

	/**
	 * The Aws SNS client.
	 * @internal
	 */
	private readonly _client: SNSClient;

	/**
	 * A variable to store the application ids to the address because of the AWS usage.
	 * @internal
	 */
	private readonly _applicationMap: Map<string, string>;

	/**
	 * Create a new instance of AwsMessagingPushNotificationConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IAwsMessagingPushNotificationConnectorConstructorOptions) {
		Guards.object(AwsMessagingPushNotificationConnector.CLASS_NAME, nameof(options), options);
		Guards.object<IAwsPushNotificationConnectorConfig>(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(options.config.region),
			options.config.region
		);

		options.config.authMode ??= "credentials";

		let credentials;
		if (options.config.authMode === "credentials") {
			Guards.stringValue(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				nameof(options.config.accessKeyId),
				options.config.accessKeyId
			);
			Guards.stringValue(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				nameof(options.config.secretAccessKey),
				options.config.secretAccessKey
			);
			credentials = {
				accessKeyId: options.config.accessKeyId,
				secretAccessKey: options.config.secretAccessKey
			};
		}

		Guards.arrayValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(options.config.applicationsSettings),
			options.config.applicationsSettings
		);

		this._logging = ComponentFactory.getIfExists(options.loggingComponentType ?? "logging");

		this._applicationMap = new Map<string, string>();
		this._config = options.config;
		this._config.endpoint = Is.stringValue(this._config.endpoint)
			? this._config.endpoint
			: undefined;
		this._client = new SNSClient({
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
		return AwsMessagingPushNotificationConnector.CLASS_NAME;
	}

	/**
	 * The component needs to be started when the node is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns Nothing.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		const nodeLogging = ComponentFactory.getIfExists<ILoggingComponent>(nodeLoggingComponentType);

		await nodeLogging?.log({
			level: "info",
			source: AwsMessagingPushNotificationConnector.CLASS_NAME,
			ts: Date.now(),
			message: "registeringApplications"
		});

		for (const app of this._config.applicationsSettings) {
			const { applicationId, pushNotificationsPlatformType, pushNotificationsPlatformCredentials } =
				app;
			try {
				const applicationAddress = await this.createPlatformApplication(
					applicationId,
					pushNotificationsPlatformType,
					pushNotificationsPlatformCredentials
				);
				this._applicationMap.set(applicationId, applicationAddress);
			} catch (err) {
				throw new GeneralError(
					AwsMessagingPushNotificationConnector.CLASS_NAME,
					"applicationRegistrationFailed",
					{ applicationId },
					err
				);
			}
		}
	}

	/**
	 * Registers a device to an specific app in order to send notifications to it.
	 * @param applicationId The application address.
	 * @param deviceToken The device token.
	 * @returns If the device was registered successfully.
	 */
	public async registerDevice(applicationId: string, deviceToken: string): Promise<string> {
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(applicationId),
			applicationId
		);
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(deviceToken),
			deviceToken
		);
		try {
			await this._logging?.log({
				level: "info",
				source: AwsMessagingPushNotificationConnector.CLASS_NAME,
				ts: Date.now(),
				message: "deviceRegistering"
			});

			const applicationArn = this._applicationMap.get(applicationId);
			if (Is.empty(applicationArn)) {
				throw new GeneralError(
					AwsMessagingPushNotificationConnector.CLASS_NAME,
					"applicationIdNotFound",
					{
						applicationId
					}
				);
			}

			const createEndpointParams = {
				PlatformApplicationArn: applicationArn,
				Token: deviceToken
			};
			const existingEndpointArn = await this.checkIfDeviceTokenExists(applicationArn, deviceToken);

			if (Is.stringValue(existingEndpointArn)) {
				return existingEndpointArn;
			}
			const command = new CreatePlatformEndpointCommand(createEndpointParams);
			const data = await this._client.send(command);

			if (!Is.stringValue(data.EndpointArn)) {
				throw new GeneralError(
					AwsMessagingPushNotificationConnector.CLASS_NAME,
					"deviceTokenRegisterFailed",
					{
						applicationId
					}
				);
			}
			return data.EndpointArn;
		} catch (err) {
			throw new GeneralError(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				"deviceTokenRegisterFailed",
				{ applicationId },
				err
			);
		}
	}

	/**
	 * Send a push notification to a device.
	 * @param deviceAddress The address of the device.
	 * @param title The title of the notification.
	 * @param message The message to send.
	 * @returns If the notification was sent successfully.
	 */
	public async sendSinglePushNotification(
		deviceAddress: string,
		title: string,
		message: string
	): Promise<boolean> {
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(deviceAddress),
			deviceAddress
		);
		Guards.stringValue(AwsMessagingPushNotificationConnector.CLASS_NAME, nameof(title), title);
		Guards.stringValue(AwsMessagingPushNotificationConnector.CLASS_NAME, nameof(message), message);
		try {
			await this._logging?.log({
				level: "info",
				source: AwsMessagingPushNotificationConnector.CLASS_NAME,
				ts: Date.now(),
				message: "pushNotificationSending"
			});
			const messagePackage = {
				default: message,
				GCM: JSON.stringify({
					notification: {
						title,
						body: message
					}
				})
			};
			const publishMessageParams = {
				Message: JSON.stringify(messagePackage),
				TargetArn: deviceAddress,
				MessageStructure: "json"
			};
			const command = new PublishCommand(publishMessageParams);
			const data = await this._client.send(command);
			if (data.$metadata.httpStatusCode !== HttpStatusCode.ok) {
				await this._logging?.log({
					level: "error",
					source: AwsMessagingPushNotificationConnector.CLASS_NAME,
					ts: Date.now(),
					message: "sendPushNotificationFailed"
				});
				throw new GeneralError(
					AwsMessagingPushNotificationConnector.CLASS_NAME,
					"sendPushNotificationFailed",
					{ value: deviceAddress },
					data
				);
			}
			return true;
		} catch (err) {
			throw new GeneralError(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				"sendPushNotificationFailed",
				{ value: deviceAddress },
				err
			);
		}
	}

	/**
	 * Creates a platform application if it does not exist.
	 * @param applicationId The application identity.
	 * @param platformType The type of platform used for the push notifications.
	 * @param platformCredentials The credentials for the used platform.
	 * @returns The platform application address.
	 */
	private async createPlatformApplication(
		applicationId: string,
		platformType: string,
		platformCredentials: string
	): Promise<string> {
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(applicationId),
			applicationId
		);
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(platformType),
			platformType
		);
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(platformCredentials),
			platformCredentials
		);
		try {
			const existingArn = await this.checkPlatformApplication(applicationId);
			if (Is.stringValue(existingArn)) {
				this._applicationMap.set(applicationId, existingArn);
				return existingArn;
			}

			await this._logging?.log({
				level: "info",
				source: AwsMessagingPushNotificationConnector.CLASS_NAME,
				ts: Date.now(),
				message: "platformAppCreating"
			});

			const createParams = {
				Name: applicationId,
				Platform: platformType,
				Attributes: {
					PlatformCredential: platformCredentials
				}
			};

			const createCommand = new CreatePlatformApplicationCommand(createParams);
			const createData = await this._client.send(createCommand);
			if (Is.stringValue(createData.PlatformApplicationArn)) {
				this._applicationMap.set(applicationId, createData.PlatformApplicationArn);
				return createData.PlatformApplicationArn;
			}
			throw new GeneralError(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				"platformAppCreationFailed",
				{ applicationId }
			);
		} catch (err) {
			throw new GeneralError(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				"platformAppCreationFailed",
				{ applicationId },
				err
			);
		}
	}

	/**
	 * Checks if the platform application exists.
	 * @param appName The name of the app.
	 * @returns The platform application address if it exists, otherwise undefined.
	 */
	private async checkPlatformApplication(appName: string): Promise<string | undefined> {
		Guards.stringValue(AwsMessagingPushNotificationConnector.CLASS_NAME, nameof(appName), appName);
		try {
			await this._logging?.log({
				level: "info",
				source: AwsMessagingPushNotificationConnector.CLASS_NAME,
				ts: Date.now(),
				message: "platformAppChecking"
			});
			const listCommand = new ListPlatformApplicationsCommand({});
			const data = await this._client.send(listCommand);
			if (Is.arrayValue(data.PlatformApplications)) {
				const existingApplication = data.PlatformApplications.find(app =>
					app.PlatformApplicationArn?.includes(appName)
				);

				if (Is.stringValue(existingApplication?.PlatformApplicationArn)) {
					return existingApplication.PlatformApplicationArn;
				}
			}
			return undefined;
		} catch (err) {
			throw new GeneralError(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				"platformAppCheckFailed",
				undefined,
				err
			);
		}
	}

	/**
	 * Checks if the device token exists in the platform application.
	 * @param applicationAddress The application address.
	 * @param deviceToken The device token.
	 * @returns The device address if it exists, otherwise undefined.
	 */
	private async checkIfDeviceTokenExists(
		applicationAddress: string,
		deviceToken: string
	): Promise<string | undefined> {
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(applicationAddress),
			applicationAddress
		);
		Guards.stringValue(
			AwsMessagingPushNotificationConnector.CLASS_NAME,
			nameof(deviceToken),
			deviceToken
		);
		try {
			await this._logging?.log({
				level: "info",
				source: AwsMessagingPushNotificationConnector.CLASS_NAME,
				ts: Date.now(),
				message: "deviceTokenChecking"
			});
			const command = new ListEndpointsByPlatformApplicationCommand({
				PlatformApplicationArn: applicationAddress
			});
			const data: ListEndpointsByPlatformApplicationResponse = await this._client.send(command);
			if (Is.arrayValue(data.Endpoints)) {
				const existingEndpoint = data.Endpoints.find(
					endpoint => endpoint.Attributes?.Token === deviceToken
				);

				if (!Is.empty(existingEndpoint)) {
					return existingEndpoint.EndpointArn;
				}
			}
			return undefined;
		} catch (err) {
			throw new GeneralError(
				AwsMessagingPushNotificationConnector.CLASS_NAME,
				"deviceTokenCheckFailed",
				undefined,
				err
			);
		}
	}
}

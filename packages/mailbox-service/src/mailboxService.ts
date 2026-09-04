// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformComponent } from "@twin.org/api-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore } from "@twin.org/context";
import {
	BaseError,
	ComponentFactory,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	ObjectHelper,
	RandomHelper
} from "@twin.org/core";
import { ComparisonOperator } from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import type { ILoggingComponent } from "@twin.org/logging-models";
import {
	EmailConsumerFactory,
	EmailProtocolConnectorFactory,
	EmailProtocolConnectorSchemaFactory,
	MailboxMetricIds,
	MailboxMetrics,
	type IEmailProtocolConnector,
	type IEmailProtocolConnectorAuthCallback,
	type IEmailProtocolConnectorRetrievalCallback,
	type IMailbox,
	type IMailStorageComponent,
	type IMailboxComponent,
	type IMailboxConfigField
} from "@twin.org/mailbox-models";
import { nameof, nameofKebabCase } from "@twin.org/nameof";
import { MetricHelper, type ITelemetryComponent } from "@twin.org/telemetry-models";
import { VaultConnectorFactory, type IVaultConnector } from "@twin.org/vault-models";
import { Mailbox } from "./entities/mailbox.js";
import type { IMailboxServiceConstructorOptions } from "./models/IMailboxServiceConstructorOptions.js";

/**
 * Service implementing mailbox management, polling orchestration, and consumer notification.
 */
export class MailboxService implements IMailboxComponent {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<MailboxService>();

	/**
	 * The entity storage connector for mailboxes.
	 * @internal
	 */
	private readonly _mailboxEntityStorage: IEntityStorageConnector<Mailbox>;

	/**
	 * The vault connector for storing secure configuration fields.
	 * @internal
	 */
	private readonly _vaultConnector: IVaultConnector;

	/**
	 * The mail storage component for persisting retrieved emails.
	 * @internal
	 */
	private readonly _mailStorageComponent: IMailStorageComponent;

	/**
	 * The platform component used to fan out across all tenant partitions.
	 * @internal
	 */
	private readonly _platformComponent: IPlatformComponent;

	/**
	 * The optional logging component.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The optional telemetry component.
	 * @internal
	 */
	private readonly _telemetry?: ITelemetryComponent;

	/**
	 * The active protocol connectors keyed by mailbox identifier.
	 * @internal
	 */
	private readonly _connectors: Map<string, IEmailProtocolConnector>;

	/**
	 * Create a new instance of MailboxService.
	 * @param options The options for the service.
	 */
	constructor(options?: IMailboxServiceConstructorOptions) {
		this._mailboxEntityStorage = EntityStorageConnectorFactory.get(
			options?.mailboxEntityStorageType ?? nameofKebabCase<Mailbox>()
		);
		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");
		this._mailStorageComponent = ComponentFactory.get<IMailStorageComponent>(
			options?.mailStorageComponentType ?? "mail-storage"
		);
		this._platformComponent = ComponentFactory.get<IPlatformComponent>(
			options?.platformComponentType ?? "platform"
		);
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._telemetry = ComponentFactory.getIfExists<ITelemetryComponent>(
			options?.telemetryComponentType ?? "telemetry"
		);
		this._connectors = new Map();
	}

	/**
	 * Get the class name.
	 * @returns The class name.
	 */
	public className(): string {
		return MailboxService.CLASS_NAME;
	}

	/**
	 * Start the component, register metrics, and resume polling for all enabled mailboxes.
	 * @param nodeLoggingComponentType Optional logging component type for node-level logging.
	 * @returns A promise that resolves when the component has started.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		await MetricHelper.createMetrics(this._telemetry, MailboxMetrics);

		await this._platformComponent.execute(async () => {
			let cursor: string | undefined;
			do {
				const result = await this._mailboxEntityStorage.query(
					{
						conditions: [
							{
								property: "enabled",
								comparison: ComparisonOperator.Equals,
								value: true
							}
						]
					},
					undefined,
					undefined,
					cursor
				);

				for (const entry of result.entities as Mailbox[]) {
					if (!entry.requiresAuth) {
						try {
							await this.startConnector(entry);
						} catch {
							await this._logging?.log({
								level: "warn",
								source: MailboxService.CLASS_NAME,
								ts: Date.now(),
								message: "startConnectorFailed",
								data: { mailboxId: entry.id }
							});
						}
					}
				}

				cursor = result.cursor;
			} while (Is.stringValue(cursor));
		});
	}

	/**
	 * Stop the component and halt polling for all mailboxes.
	 * @param nodeLoggingComponentType Optional logging component type for node-level logging.
	 * @returns A promise that resolves when the component has stopped.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		for (const [, connector] of this._connectors) {
			await connector.retrieveStop();
		}
		this._connectors.clear();
	}

	/**
	 * Add a new mailbox and begin polling for it.
	 * @param mailbox The mailbox configuration to add.
	 * @returns The identifier assigned to the new mailbox.
	 */
	public async addMailbox(
		mailbox: Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">
	): Promise<string> {
		Guards.object(MailboxService.CLASS_NAME, nameof(mailbox), mailbox);
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(mailbox.name), mailbox.name);
		Guards.stringValue(
			MailboxService.CLASS_NAME,
			nameof(mailbox.connectorType),
			mailbox.connectorType
		);
		this.guardConnectorType(mailbox.connectorType);

		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Node);
		const tenantId = contextIds?.[ContextIdKeys.Tenant];
		const nodeId = contextIds[ContextIdKeys.Node];

		const id = RandomHelper.generateUuidV7();

		const strippedConfig = await this.storeSecureFields(id, mailbox.connectorType, mailbox.config);

		const entry = new Mailbox();
		entry.id = id;
		entry.name = mailbox.name;
		entry.connectorType = mailbox.connectorType;
		entry.config = strippedConfig;
		entry.enabled = mailbox.enabled;
		entry.tenantId = tenantId;
		entry.nodeId = nodeId;

		await this._mailboxEntityStorage.set(entry);

		if (mailbox.enabled) {
			await this.startConnector(entry);
		}

		return id;
	}

	/**
	 * Update an existing mailbox.
	 * @param mailbox The updated mailbox configuration.
	 * @returns A promise that resolves when the mailbox has been updated.
	 */
	public async updateMailbox(mailbox: IMailbox): Promise<void> {
		Guards.object<IMailbox>(MailboxService.CLASS_NAME, nameof(mailbox), mailbox);
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(mailbox.id), mailbox.id);

		const existing = await this._mailboxEntityStorage.get(mailbox.id);

		if (Is.empty(existing)) {
			throw new NotFoundError(MailboxService.CLASS_NAME, "mailboxNotFound", mailbox.id);
		}

		if (mailbox.connectorType !== existing.connectorType) {
			throw new GeneralError(MailboxService.CLASS_NAME, "connectorTypeCannotChange");
		}
		this.guardConnectorType(mailbox.connectorType);

		if (this._connectors.has(mailbox.id)) {
			const existingConnector = this._connectors.get(mailbox.id);

			if (Is.notEmpty(existingConnector)) {
				await existingConnector.retrieveStop();
			}
			this._connectors.delete(mailbox.id);
		}

		existing.name = mailbox.name;
		existing.connectorType = mailbox.connectorType;
		// An omitted config clears both the persisted config and any vault secrets.
		if (Is.empty(mailbox.config)) {
			await this.removeVaultSecrets(mailbox.id, mailbox.connectorType);
			existing.config = undefined;
		} else {
			existing.config = await this.storeSecureFields(
				mailbox.id,
				mailbox.connectorType,
				mailbox.config
			);
		}
		existing.enabled = mailbox.enabled;
		existing.requiresAuth = undefined;
		existing.authState = undefined;
		existing.authError = undefined;
		existing.retrievalError = undefined;

		await this._mailboxEntityStorage.set(existing);

		if (mailbox.enabled) {
			await this.startConnector(existing);
		}
	}

	/**
	 * Remove a mailbox and stop polling for it.
	 * @param id The identifier of the mailbox to remove.
	 * @returns A promise that resolves when the mailbox has been removed.
	 */
	public async removeMailbox(id: string): Promise<void> {
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(id), id);

		const existing = await this._mailboxEntityStorage.get(id);

		if (Is.empty(existing)) {
			throw new NotFoundError(MailboxService.CLASS_NAME, "mailboxNotFound", id);
		}

		const connector = this._connectors.get(id);
		if (Is.notEmpty(connector)) {
			await connector.retrieveStop();
			this._connectors.delete(id);
		}

		await this.removeVaultSecrets(id, existing.connectorType);
		await this._mailboxEntityStorage.remove(id);
	}

	/**
	 * Retrieve a mailbox by its identifier.
	 * @param id The identifier of the mailbox to retrieve.
	 * @returns The mailbox.
	 */
	public async getMailbox(id: string): Promise<IMailbox> {
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(id), id);

		const existing = await this._mailboxEntityStorage.get(id);

		if (Is.empty(existing)) {
			throw new NotFoundError(MailboxService.CLASS_NAME, "mailboxNotFound", id);
		}

		return this.entryToMailbox(existing);
	}

	/**
	 * List all mailboxes with optional cursor-based pagination.
	 * @param cursor An optional cursor for paginated results.
	 * @param limit An optional maximum number of results to return.
	 * @returns A page of mailboxes and an optional cursor for the next page.
	 */
	public async listMailboxes(
		cursor?: string,
		limit?: number
	): Promise<{ mailboxes: IMailbox[]; cursor?: string }> {
		const result = await this._mailboxEntityStorage.query(
			undefined,
			undefined,
			undefined,
			cursor,
			limit
		);

		return {
			mailboxes: (result.entities as Mailbox[]).map(e => this.entryToMailbox(e)),
			cursor: result.cursor
		};
	}

	/**
	 * Get the configuration schema for a connector type.
	 * @param connectorType The connector type to get the schema for.
	 * @returns The configuration field definitions for the connector.
	 * @throws NotFoundError if no schema is registered for the connector type.
	 */
	public async getSchema(connectorType: string): Promise<IMailboxConfigField[]> {
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(connectorType), connectorType);

		const schema = EmailProtocolConnectorSchemaFactory.getIfExists(connectorType);

		if (Is.empty(schema)) {
			throw new NotFoundError(MailboxService.CLASS_NAME, "schemaNotFound", connectorType);
		}

		return schema;
	}

	/**
	 * Start the protocol connector for a mailbox entry.
	 * @param entry The mailbox entry to start.
	 * @internal
	 */
	private async startConnector(entry: Mailbox): Promise<void> {
		if (!EmailProtocolConnectorFactory.names().includes(entry.connectorType)) {
			await this._logging?.log({
				level: "error",
				source: MailboxService.CLASS_NAME,
				ts: Date.now(),
				message: "unknownConnectorType",
				data: { connectorType: entry.connectorType, mailboxId: entry.id }
			});
			return;
		}

		const secureConfig = await this.buildSecureConfig(entry);
		const connector = EmailProtocolConnectorFactory.create(entry.connectorType, {
			config: secureConfig
		});
		await connector.retrieve(
			entry.id,
			entry.state ?? {},
			this.buildRetrievalAuthCallback(entry),
			this.buildRetrievalCallback(entry)
		);
		this._connectors.set(entry.id, connector);
	}

	/**
	 * Build the auth callback for a mailbox retrieval connector.
	 * @param entry The mailbox entry the callback applies to.
	 * @returns The authentication callback function.
	 * @internal
	 */
	private buildRetrievalAuthCallback(entry: Mailbox): IEmailProtocolConnectorAuthCallback {
		return async (mailboxId, updatedState, requiresAuth, authState, authError) => {
			await ContextIdStore.run(
				{ [ContextIdKeys.Node]: entry.nodeId, [ContextIdKeys.Tenant]: entry.tenantId },
				async () => {
					const current = await this._mailboxEntityStorage.get(entry.id);
					if (Is.empty(current)) {
						return;
					}

					if (Is.notEmpty(updatedState)) {
						current.state = updatedState;
					}

					current.authState = authState;
					current.authError = authError;
					current.requiresAuth = requiresAuth;

					await this._mailboxEntityStorage.set(current);

					if (requiresAuth) {
						const connector = this._connectors.get(entry.id);
						await connector?.retrieveStop();
						this._connectors.delete(entry.id);
					}
				}
			);
		};
	}

	/**
	 * Build the retrieval callback for a mailbox connector.
	 * @param entry The mailbox entry the callback applies to.
	 * @returns The retrieval callback function.
	 * @internal
	 */
	private buildRetrievalCallback(entry: Mailbox): IEmailProtocolConnectorRetrievalCallback {
		return async (mailboxId, message, updatedState, retrievalError) => {
			try {
				return await ContextIdStore.run(
					{ [ContextIdKeys.Tenant]: entry.tenantId, [ContextIdKeys.Node]: entry.nodeId },
					async (): Promise<boolean> => {
						const current = await this._mailboxEntityStorage.get(entry.id);
						if (Is.empty(current)) {
							return false;
						}

						if (Is.notEmpty(message)) {
							await this._mailStorageComponent.store(entry.id, message);

							await MetricHelper.metricIncrement(this._telemetry, MailboxMetricIds.EmailsReceived, {
								mailboxId: entry.id,
								tenantId: entry.tenantId,
								nodeId: entry.nodeId,
								count: 1
							});

							const consumerNames = EmailConsumerFactory.names();
							for (const consumerName of consumerNames) {
								try {
									const consumer = EmailConsumerFactory.get(consumerName);
									await consumer.onNewMessages();
								} catch (consumerError) {
									await this._logging?.log({
										level: "warn",
										source: MailboxService.CLASS_NAME,
										ts: Date.now(),
										message: "consumerNotificationFailed",
										data: { consumerName, error: consumerError }
									});
								}
							}
						}

						current.state = updatedState;
						current.retrievalError = retrievalError;

						await this._mailboxEntityStorage.set(current);
						return true;
					}
				);
			} catch (err) {
				await this._logging?.log({
					level: "error",
					source: MailboxService.CLASS_NAME,
					ts: Date.now(),
					message: "retrievalCallbackFailed",
					data: { mailboxId },
					error: BaseError.fromError(err)
				});

				return false;
			}
		};
	}

	/**
	 * Ensure a connector type has a registered protocol connector.
	 * @param connectorType The connector type to validate.
	 * @throws GeneralError if no connector is registered for the type.
	 * @internal
	 */
	private guardConnectorType(connectorType: string): void {
		if (!EmailProtocolConnectorFactory.names().includes(connectorType)) {
			throw new GeneralError(MailboxService.CLASS_NAME, "unknownConnectorType", { connectorType });
		}
	}

	/**
	 * Store secure configuration fields in the vault and return a stripped config copy.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param connectorType The connector type to look up the schema for.
	 * @param config The full configuration object.
	 * @returns The configuration with secure fields removed.
	 * @internal
	 */
	private async storeSecureFields(
		mailboxId: string,
		connectorType: string,
		config: unknown
	): Promise<unknown> {
		if (Is.empty(config)) {
			return config;
		}

		// The connector type has already been validated, so a missing schema means the
		// connector declares no secure fields and the config can be stored as-is.
		if (!EmailProtocolConnectorSchemaFactory.names().includes(connectorType)) {
			return config;
		}

		const schema = EmailProtocolConnectorSchemaFactory.get(connectorType);
		const configCopy = ObjectHelper.clone(config) as { [key: string]: unknown };

		for (const field of schema) {
			if (field.isSecure && Is.notEmpty(configCopy[field.propertyKey])) {
				await this._vaultConnector.setSecret(
					`mailbox:${mailboxId}/${field.propertyKey}`,
					configCopy[field.propertyKey]
				);
				delete configCopy[field.propertyKey];
			}
		}

		return configCopy;
	}

	/**
	 * Build a config object with secure fields restored from the vault.
	 * @param entry The mailbox entry to hydrate.
	 * @returns The configuration with secure fields restored.
	 * @internal
	 */
	private async buildSecureConfig(entry: Mailbox): Promise<unknown> {
		if (!EmailProtocolConnectorSchemaFactory.names().includes(entry.connectorType)) {
			return entry.config;
		}

		const config: { [key: string]: unknown } = Is.notEmpty(entry.config) ? { ...entry.config } : {};

		const schema = EmailProtocolConnectorSchemaFactory.get(entry.connectorType);
		for (const field of schema) {
			if (field.isSecure) {
				const secretKey = `mailbox:${entry.id}/${field.propertyKey}`;
				if (await this._vaultConnector.secretExists(secretKey)) {
					config[field.propertyKey] = await this._vaultConnector.getSecret(secretKey);
				}
			}
		}

		return config;
	}

	/**
	 * Remove all vault secrets associated with a mailbox.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param connectorType The connector type to look up the schema for.
	 * @internal
	 */
	private async removeVaultSecrets(mailboxId: string, connectorType: string): Promise<void> {
		if (!EmailProtocolConnectorSchemaFactory.names().includes(connectorType)) {
			return;
		}

		const schema = EmailProtocolConnectorSchemaFactory.get(connectorType);
		for (const field of schema) {
			if (field.isSecure) {
				const secretKey = `mailbox:${mailboxId}/${field.propertyKey}`;
				if (await this._vaultConnector.secretExists(secretKey)) {
					await this._vaultConnector.removeSecret(secretKey);
				}
			}
		}
	}

	/**
	 * Convert a mailbox entry to a public-facing mailbox object.
	 * @param entry The mailbox entry to convert.
	 * @returns The mailbox without internal context identifiers.
	 * @internal
	 */
	private entryToMailbox(entry: Mailbox): IMailbox {
		return {
			id: entry.id,
			name: entry.name,
			connectorType: entry.connectorType,
			config: entry.config,
			enabled: entry.enabled,
			requiresAuth: entry.requiresAuth,
			authState: entry.authState,
			authError: entry.authError,
			retrievalError: entry.retrievalError,
			state: entry.state
		};
	}
}

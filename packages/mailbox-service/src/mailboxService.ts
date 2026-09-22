// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys, HttpUrlHelper, type IPlatformComponent } from "@twin.org/api-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore } from "@twin.org/context";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	StringHelper
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
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory,
	MailboxMetricIds,
	MailboxMetrics,
	type IEmailProtocolConnector,
	type IEmailProtocolConnectorAuthCallback,
	type IEmailProtocolConnectorAuthState,
	type IEmailProtocolConnectorOptions,
	type IEmailProtocolConnectorRetrievalCallback,
	type IMailbox,
	type IMailboxCreateResult,
	type IMailboxUpdateResult,
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
	 * The callback path used when the configuration does not set one.
	 * Every external authentication flow returns here, whichever mailbox it belongs to.
	 */
	public static readonly DEFAULT_AUTH_CALLBACK_PATH: string = "/mailbox/authcallback";

	/**
	 * The separator between the tenant and the mailbox identifier in the correlation state an
	 * external authentication flow carries.
	 * @internal
	 */
	private static readonly _CORRELATION_SEPARATOR: string = "/";

	/**
	 * The length in bytes of the nonce an external authentication flow carries.
	 * @internal
	 */
	private static readonly _AUTH_NONCE_LENGTH: number = 16;

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
	 * The path external authentication flows return to, with a single leading slash and no
	 * trailing slash, resolved against the public origin of the request.
	 * @internal
	 */
	private readonly _authCallbackPath: string;

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
		// Only a configured path needs normalising, the default is already in the right form.
		this._authCallbackPath = Is.stringValue(options?.config?.authCallbackPath)
			? `/${StringHelper.trimLeadingAndTrailingSlashes(options.config.authCallbackPath)}`
			: MailboxService.DEFAULT_AUTH_CALLBACK_PATH;
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
	 * Create a new mailbox and begin polling for it.
	 * Connectors whose credentials are issued by an external flow are asked to start it here, so
	 * the URL the user has to open is returned to the caller which created the mailbox instead of
	 * only surfacing once the first poll has run.
	 * @param mailbox The mailbox configuration to create.
	 * @returns The identifier assigned to the new mailbox, with the URL to open when the mailbox
	 * must be authenticated before it can be polled.
	 */
	public async createMailbox(
		mailbox: Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">
	): Promise<IMailboxCreateResult> {
		Guards.object(MailboxService.CLASS_NAME, nameof(mailbox), mailbox);
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(mailbox.name), mailbox.name);
		Guards.stringValue(
			MailboxService.CLASS_NAME,
			nameof(mailbox.connectorType),
			mailbox.connectorType
		);
		this.guardConnectorType(mailbox.connectorType);
		// Nothing is stored until the connector has accepted the configuration, so a rejected
		// one cannot leave a mailbox behind which can never be polled.
		this.guardConnectorConfig(mailbox.connectorType, mailbox.config);

		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Node);
		// We need the public origin set so that callbacks can be correctly formed.
		ContextIdHelper.guard(contextIds, HttpContextIdKeys.PublicOrigin);

		const tenantId = contextIds?.[ContextIdKeys.Tenant];
		const nodeId = contextIds[ContextIdKeys.Node];
		const publicOrigin = contextIds[HttpContextIdKeys.PublicOrigin];

		const id = RandomHelper.generateUuidV7();

		const strippedConfig = await this.storeSecureFields(id, mailbox.connectorType, mailbox.config);

		const entry = new Mailbox();
		entry.id = id;
		entry.authNonce = this.generateAuthNonce();
		entry.name = mailbox.name;
		entry.connectorType = mailbox.connectorType;
		entry.config = strippedConfig;
		entry.enabled = mailbox.enabled;
		entry.tenantId = tenantId;
		entry.nodeId = nodeId;
		entry.publicOrigin = publicOrigin;

		await this._mailboxEntityStorage.set(entry);

		let authState: IEmailProtocolConnectorAuthState | undefined;

		if (mailbox.enabled) {
			authState = await this.initiateConnectorAuth(entry);

			if (Is.notEmpty(authState)) {
				// The connector started a flow, so the mailbox is held until the callback lands
				// rather than polled with credentials it does not have yet.
				entry.requiresAuth = true;
				entry.authState = authState;
				await this._mailboxEntityStorage.set(entry);
			} else {
				await this.startConnector(entry);
			}
		}

		// Only the URL is handed back, the rest of the auth state is the connector's own and is
		// kept on the mailbox for the flow to be picked up again later.
		return { id, authUrl: authState?.authUrl };
	}

	/**
	 * Update an existing mailbox.
	 * An update replaces the credentials the mailbox authenticates with, so a connector whose
	 * credentials are issued by an external flow is asked to start a new one, and the URL the
	 * user has to open is returned the same way it is when the mailbox is created.
	 * @param mailbox The updated mailbox configuration.
	 * @returns The URL to open when the mailbox must be authenticated before it can be polled.
	 */
	public async updateMailbox(mailbox: IMailbox): Promise<IMailboxUpdateResult> {
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

		// The stored configuration and its vaulted secrets are only replaced once the connector
		// has accepted what replaces them, so a rejected update leaves the mailbox as it was
		// rather than stripping the credentials it was working with.
		const updatedConfig = await this.buildUpdatedConfig(existing, mailbox.config);
		this.guardConnectorConfig(mailbox.connectorType, updatedConfig);

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

		let authState: IEmailProtocolConnectorAuthState | undefined;

		if (mailbox.enabled) {
			// The update replaced the credentials, so a connector which needs an external flow
			// starts a new one here rather than leaving the caller to wait for a poll cycle.
			authState = await this.initiateConnectorAuth(existing);

			if (Is.notEmpty(authState)) {
				existing.requiresAuth = true;
				existing.authState = authState;
				await this._mailboxEntityStorage.set(existing);
			} else {
				await this.startConnector(existing);
			}
		}

		return { authUrl: authState?.authUrl };
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
	 * Complete an authentication flow for a mailbox awaiting authentication.
	 * The mailbox is correlated from the payload's state property, which the connector placed in
	 * the external flow when it produced its auth state, and which names the partition as well as
	 * the mailbox. The connector exchanges the payload for its credentials, which are stored on
	 * the mailbox state, and polling restarts.
	 * @param authPayload The data handed to the callback URI, carrying the correlating state.
	 * @returns A promise that resolves when the mailbox has been authenticated.
	 * @throws NotFoundError if the correlated mailbox does not exist.
	 * @throws GeneralError if the mailbox is not awaiting authentication, or its connector has no
	 * authentication flow.
	 */
	public async completeAuth(authPayload: unknown): Promise<void> {
		Guards.object(MailboxService.CLASS_NAME, nameof(authPayload), authPayload);

		// The callback URI is fixed for the whole deployment, so the mailbox is identified by the
		// state the connector carried through the external flow and handed back here.
		const payload = Is.object<{ state?: unknown }>(authPayload) ? authPayload : undefined;
		const state = Coerce.string(payload?.state);
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(state), state);

		// The route skips authentication and the tenant requirement, since it is called by the
		// external provider, so the partition to read comes from the state itself rather than
		// from the request, and no search across the other partitions is needed.
		const correlation = this.parseCorrelationState(state);
		const contextIds = await ContextIdStore.getContextIds();

		const existing = await ContextIdStore.run(
			{
				[ContextIdKeys.Node]: contextIds?.[ContextIdKeys.Node],
				[ContextIdKeys.Tenant]: correlation.tenantId
			},
			async () => this._mailboxEntityStorage.get(correlation.mailboxId)
		);

		if (Is.empty(existing)) {
			throw new NotFoundError(MailboxService.CLASS_NAME, "mailboxNotFound", correlation.mailboxId);
		}

		const entry = existing;

		// Only a mailbox which actually asked to be authenticated can be completed, so a stale or
		// replayed callback cannot disturb one which is already polling.
		if (entry.requiresAuth !== true) {
			throw new GeneralError(MailboxService.CLASS_NAME, "authNotPending", {
				mailboxId: correlation.mailboxId
			});
		}

		// The route is unauthenticated, so the nonce the flow was started with is what proves the
		// callback belongs to the flow this mailbox is waiting for.
		if (entry.authNonce !== correlation.authNonce) {
			throw new GeneralError(MailboxService.CLASS_NAME, "authStateMismatch", {
				mailboxId: correlation.mailboxId
			});
		}

		this.guardConnectorType(entry.connectorType);

		// Everything from here on is partitioned, so it runs under the context the mailbox
		// captured when it was added rather than the context of this request.
		await ContextIdStore.run(
			{ [ContextIdKeys.Node]: entry.nodeId, [ContextIdKeys.Tenant]: entry.tenantId },
			async () => {
				// Starting the connector wires up the callbacks, so the connector can report the
				// outcome of the flow and have the state it produces persisted.
				await this.startConnector(entry);

				const connector = this._connectors.get(entry.id);
				const completeAuth = connector?.completeAuth?.bind(connector);

				if (Is.empty(completeAuth)) {
					throw new GeneralError(MailboxService.CLASS_NAME, "authNotSupported", {
						connectorType: entry.connectorType
					});
				}

				try {
					// The exchange has to repeat the callback URI the consent flow was started with.
					await completeAuth(entry.id, authPayload, this.buildConnectorOptions(entry));
				} catch (error) {
					// The mailbox is still unauthenticated, so the connector started for the
					// exchange is stopped rather than left polling credentials it never received.
					const connectorToStop = this._connectors.get(entry.id);
					await connectorToStop?.retrieveStop();
					this._connectors.delete(entry.id);
					throw error;
				}

				// The state which completed the flow must not complete another, so the nonce is
				// replaced and the connector restarted, which is what gives it the options a
				// later flow would be started with.
				const rotated = await this.rotateAuthNonce(entry.id);
				if (Is.notEmpty(rotated)) {
					await this.startConnector(rotated);
				}
			}
		);
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

		const schema = EmailProtocolConnectorConfigSchemaFactory.getIfExists(connectorType);

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
		// A mailbox is only ever polled by one connector, so a restart replaces the instance
		// which was running rather than leaving it to poll alongside the new one.
		const running = this._connectors.get(entry.id);
		if (Is.notEmpty(running)) {
			await running.retrieveStop();
			this._connectors.delete(entry.id);
		}

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

		await this.ensureAuthNonce(entry);

		const secureConfig = await this.buildSecureConfig(entry);
		const connector = EmailProtocolConnectorFactory.create(entry.connectorType, {
			config: secureConfig
		});
		await connector.retrieve(
			entry.id,
			await this.buildSecureState(entry),
			this.buildRetrievalAuthCallback(entry),
			this.buildRetrievalCallback(entry),
			this.buildConnectorOptions(entry)
		);
		this._connectors.set(entry.id, connector);
	}

	/**
	 * Ask the protocol connector to start an authentication flow for a new mailbox.
	 * @param entry The mailbox entry to authenticate.
	 * @returns The auth state the connector produced, or undefined when the connector has no
	 * authentication flow or the mailbox can already authenticate itself.
	 * @internal
	 */
	private async initiateConnectorAuth(
		entry: Mailbox
	): Promise<IEmailProtocolConnectorAuthState | undefined> {
		await this.ensureAuthNonce(entry);

		const secureConfig = await this.buildSecureConfig(entry);
		const connector = EmailProtocolConnectorFactory.create(entry.connectorType, {
			config: secureConfig
		});

		const initiateAuth = connector.initiateAuth?.bind(connector);
		if (Is.empty(initiateAuth)) {
			return undefined;
		}

		return initiateAuth(
			entry.id,
			await this.buildSecureState(entry),
			this.buildConnectorOptions(entry)
		);
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
						// Credentials the flow issued travel in the state, so the properties the
						// connector state schema marks as secure end up in the vault.
						current.state = await this.storeSecureState(
							entry.id,
							current.connectorType,
							updatedState
						);
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

						let storeError: unknown;
						let messageStored = false;

						if (Is.notEmpty(message)) {
							try {
								await this._mailStorageComponent.store(entry.id, message);
								messageStored = true;
							} catch (err) {
								// A connector rewinds its cursor when the callback returns false, so a
								// message which can never be stored would wedge every later one behind it.
								// It is left behind and recorded on the mailbox instead.
								storeError = err;

								await this._logging?.log({
									level: "error",
									source: MailboxService.CLASS_NAME,
									ts: Date.now(),
									message: "emailStoreFailed",
									data: { mailboxId: entry.id },
									error: BaseError.fromError(err)
								});
							}
						}

						if (messageStored) {
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

						current.state = await this.storeSecureState(
							entry.id,
							current.connectorType,
							updatedState
						);
						const failure = storeError ?? retrievalError;
						current.retrievalError = Is.notEmpty(failure)
							? BaseError.fromError(failure).toJsonObject()
							: undefined;

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
	 * Generate the value an external authentication flow carries alongside the mailbox
	 * identifier, which the callback is checked against.
	 * @returns The nonce.
	 * @internal
	 */
	private generateAuthNonce(): string {
		return Converter.bytesToHex(RandomHelper.generate(MailboxService._AUTH_NONCE_LENGTH));
	}

	/**
	 * Build the correlation state an external authentication flow carries for a mailbox.
	 * @param entry The mailbox entry the flow belongs to.
	 * @returns The correlation state.
	 * @internal
	 */
	private buildCorrelationState(entry: Mailbox): string {
		// The tenant travels alongside the mailbox identifier so the callback reads the partition
		// the mailbox lives in directly, instead of searching every one of them for it. The nonce
		// makes the value impossible to predict, so a caller which was never given the URL cannot
		// bind the mailbox to an account of its own through the unauthenticated callback route.
		const segments = Is.stringValue(entry.tenantId)
			? [entry.tenantId, entry.id, entry.authNonce]
			: [entry.id, entry.authNonce];

		return segments.join(MailboxService._CORRELATION_SEPARATOR);
	}

	/**
	 * Split the correlation state an external authentication flow handed back.
	 * @param correlationState The correlation state returned by the flow.
	 * @returns The mailbox identifier with the tenant it belongs to, absent on a single-tenant node.
	 * @internal
	 */
	private parseCorrelationState(correlationState: string): {
		tenantId?: string;
		mailboxId: string;
		authNonce: string;
	} {
		// The nonce and the mailbox identifier carry no separator of their own, so they are the
		// last two segments and everything before them is a tenant which may itself be a path.
		const segments = correlationState.split(MailboxService._CORRELATION_SEPARATOR);

		const authNonce = segments.pop();
		const mailboxId = segments.pop();

		Guards.stringValue(MailboxService.CLASS_NAME, nameof(mailboxId), mailboxId);
		Guards.stringValue(MailboxService.CLASS_NAME, nameof(authNonce), authNonce);

		const tenantId = segments.join(MailboxService._CORRELATION_SEPARATOR);

		return {
			tenantId: Is.stringValue(tenantId) ? tenantId : undefined,
			mailboxId,
			authNonce
		};
	}

	/**
	 * Build the options handed to the protocol connector for a mailbox.
	 * @param entry The mailbox entry the options apply to.
	 * @returns The connector options.
	 * @internal
	 */
	private buildConnectorOptions(entry: Mailbox): IEmailProtocolConnectorOptions {
		return {
			callbackUri: this.buildCallbackUri(entry),
			correlationState: this.buildCorrelationState(entry)
		};
	}

	/**
	 * Give a mailbox the nonce an external authentication flow carries, if it has none.
	 * @param entry The mailbox entry to assign a nonce to.
	 * @internal
	 */
	private async ensureAuthNonce(entry: Mailbox): Promise<void> {
		if (Is.stringValue(entry.authNonce)) {
			return;
		}

		entry.authNonce = this.generateAuthNonce();

		await this._mailboxEntityStorage.set(entry);
	}

	/**
	 * Replace the nonce a mailbox carries through an external authentication flow.
	 * @param mailboxId The identifier of the mailbox to rotate the nonce for.
	 * @returns The mailbox entry the nonce was replaced on, or undefined if it has since gone.
	 * @internal
	 */
	private async rotateAuthNonce(mailboxId: string): Promise<Mailbox | undefined> {
		// The entry is read back rather than reused, the connector reported the outcome of the
		// flow through the auth callback and that already persisted the entity.
		const current = await this._mailboxEntityStorage.get(mailboxId);

		if (Is.empty(current)) {
			return undefined;
		}

		current.authNonce = this.generateAuthNonce();
		await this._mailboxEntityStorage.set(current);

		return current;
	}

	/**
	 * Ensure a connector can be constructed from a configuration.
	 * Building the connector is what validates the configuration, and it also registers the
	 * connector's schemas, so it runs before any secure property is written to the vault.
	 * @param connectorType The connector type to construct.
	 * @param config The configuration to validate.
	 * @throws GeneralError if the connector rejects the configuration.
	 * @internal
	 */
	private guardConnectorConfig(connectorType: string, config: unknown): void {
		try {
			EmailProtocolConnectorFactory.create(connectorType, { config });
		} catch (error) {
			throw new GeneralError(
				MailboxService.CLASS_NAME,
				"connectorConfigInvalid",
				{ connectorType },
				BaseError.fromError(error)
			);
		}
	}

	/**
	 * Build the configuration a mailbox will hold once an update is applied.
	 * A secure property the caller left out keeps the value already in the vault, so the update
	 * is validated against the configuration the mailbox actually ends up with.
	 * @param entry The mailbox entry being updated.
	 * @param config The configuration supplied by the caller.
	 * @returns The configuration the update produces.
	 * @internal
	 */
	private async buildUpdatedConfig(entry: Mailbox, config: unknown): Promise<unknown> {
		if (!Is.object<{ [propertyKey: string]: unknown }>(config)) {
			return config;
		}

		const updated = { ...config };

		if (EmailProtocolConnectorConfigSchemaFactory.names().includes(entry.connectorType)) {
			const restored = await this.buildSecureConfig(entry);
			const restoredConfig = Is.object<{ [propertyKey: string]: unknown }>(restored)
				? restored
				: {};

			const schema = EmailProtocolConnectorConfigSchemaFactory.get(entry.connectorType);
			for (const field of schema) {
				if (field.isSecure && Is.empty(updated[field.propertyKey])) {
					const storedValue = restoredConfig[field.propertyKey];
					if (Is.notEmpty(storedValue)) {
						updated[field.propertyKey] = storedValue;
					}
				}
			}
		}

		return updated;
	}

	/**
	 * Build the callback URI an external authentication flow returns to for a mailbox.
	 * @param entry The mailbox entry holding the origin captured when it was added.
	 * @returns The absolute callback URI, or undefined when the mailbox has no captured origin.
	 * @internal
	 */
	private buildCallbackUri(entry: Mailbox): string | undefined {
		if (!Is.stringValue(entry.publicOrigin)) {
			// A mailbox stored before an origin was captured, or one whose protocol has no
			// authentication flow, still polls with the credentials it holds. Only a flow needs
			// somewhere to return to, and the connectors which start one check for it.
			return undefined;
		}

		return Coerce.string(
			HttpUrlHelper.combineOriginPath(entry.publicOrigin, this._authCallbackPath)
		);
	}

	/**
	 * Build the vault key holding a secure configuration property for a mailbox.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param propertyKey The configuration property the secret holds.
	 * @returns The vault key.
	 * @internal
	 */
	private buildConfigSecretKey(mailboxId: string, propertyKey: string): string {
		return `mailbox:${mailboxId}/config/${propertyKey}`;
	}

	/**
	 * Build the vault key a secure configuration property was held under before the config and
	 * state properties were separated into their own key spaces.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param propertyKey The configuration property the secret holds.
	 * @returns The legacy vault key.
	 * @internal
	 */
	private buildLegacyConfigSecretKey(mailboxId: string, propertyKey: string): string {
		return `mailbox:${mailboxId}/${propertyKey}`;
	}

	/**
	 * Build the vault key holding a secure state property for a mailbox.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param propertyKey The state property the secret holds.
	 * @returns The vault key.
	 * @internal
	 */
	private buildStateSecretKey(mailboxId: string, propertyKey: string): string {
		return `mailbox:${mailboxId}/state/${propertyKey}`;
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
		if (!EmailProtocolConnectorConfigSchemaFactory.names().includes(connectorType)) {
			return config;
		}

		const schema = EmailProtocolConnectorConfigSchemaFactory.get(connectorType);
		const configCopy = ObjectHelper.clone(config) as { [key: string]: unknown };

		for (const field of schema) {
			const value = configCopy[field.propertyKey];
			if (field.isSecure && Is.notEmpty(value)) {
				const secretKey = this.buildConfigSecretKey(mailboxId, field.propertyKey);

				if (Is.string(value) && value.length === 0) {
					// An emptied credential has been revoked, so the secret is removed rather than
					// left in the vault as a blank value which would still satisfy a lookup.
					if (await this._vaultConnector.secretExists(secretKey)) {
						await this._vaultConnector.removeSecret(secretKey);
					}
				} else {
					await this._vaultConnector.setSecret(secretKey, value);
				}

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
		if (!EmailProtocolConnectorConfigSchemaFactory.names().includes(entry.connectorType)) {
			return entry.config;
		}

		const config: { [key: string]: unknown } = Is.notEmpty(entry.config) ? { ...entry.config } : {};

		const schema = EmailProtocolConnectorConfigSchemaFactory.get(entry.connectorType);
		for (const field of schema) {
			if (field.isSecure) {
				const secretKey = this.buildConfigSecretKey(entry.id, field.propertyKey);

				if (await this._vaultConnector.secretExists(secretKey)) {
					config[field.propertyKey] = await this._vaultConnector.getSecret(secretKey);
				} else {
					const legacyValue = await this.migrateLegacyConfigSecret(entry.id, field.propertyKey);
					if (Is.notEmpty(legacyValue)) {
						config[field.propertyKey] = legacyValue;
					}
				}
			}
		}

		return config;
	}

	/**
	 * Store secure state properties in the vault and return a stripped state copy.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param connectorType The connector type to look up the state schema for.
	 * @param state The full state object reported by the connector.
	 * @returns The state with secure properties removed.
	 * @internal
	 */
	private async storeSecureState(
		mailboxId: string,
		connectorType: string,
		state: unknown
	): Promise<unknown> {
		// A connector which reports no state cannot be revoking anything, so the vault is left
		// exactly as the last reported state put it.
		if (!Is.object<{ [key: string]: unknown }>(state)) {
			return state;
		}

		if (!EmailProtocolConnectorStateSchemaFactory.names().includes(connectorType)) {
			return state;
		}

		const schema = EmailProtocolConnectorStateSchemaFactory.get(connectorType);
		const stateCopy = ObjectHelper.clone(state);

		for (const field of schema) {
			if (field.isSecure) {
				const secretKey = this.buildStateSecretKey(mailboxId, field.propertyKey);
				const value = stateCopy[field.propertyKey];
				delete stateCopy[field.propertyKey];

				const stored = (await this._vaultConnector.secretExists(secretKey))
					? await this._vaultConnector.getSecret(secretKey)
					: undefined;

				if (Is.empty(value)) {
					// The state is replaced whole on every report, so a credential which is no
					// longer in it has been revoked and the vaulted copy goes with it.
					if (Is.notEmpty(stored)) {
						await this._vaultConnector.removeSecret(secretKey);
					}
				} else if (!ObjectHelper.equal(stored, value)) {
					// State is reported on every poll cycle, so the vault is only written when
					// the credential has actually changed.
					await this._vaultConnector.setSecret(secretKey, value);
				}
			}
		}

		return stateCopy;
	}

	/**
	 * Build a state object with secure properties restored from the vault.
	 * @param entry The mailbox entry to hydrate.
	 * @returns The state with secure properties restored.
	 * @internal
	 */
	private async buildSecureState(entry: Mailbox): Promise<unknown> {
		if (!EmailProtocolConnectorStateSchemaFactory.names().includes(entry.connectorType)) {
			return entry.state ?? {};
		}

		const state: { [key: string]: unknown } = Is.object(entry.state) ? { ...entry.state } : {};

		const schema = EmailProtocolConnectorStateSchemaFactory.get(entry.connectorType);
		for (const field of schema) {
			if (field.isSecure) {
				const secretKey = this.buildStateSecretKey(entry.id, field.propertyKey);
				if (await this._vaultConnector.secretExists(secretKey)) {
					state[field.propertyKey] = await this._vaultConnector.getSecret(secretKey);
				}
			}
		}

		return state;
	}

	/**
	 * Remove all vault secrets associated with a mailbox.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param connectorType The connector type to look up the schema for.
	 * @internal
	 */
	private async removeVaultSecrets(mailboxId: string, connectorType: string): Promise<void> {
		if (EmailProtocolConnectorConfigSchemaFactory.names().includes(connectorType)) {
			const schema = EmailProtocolConnectorConfigSchemaFactory.get(connectorType);
			for (const field of schema) {
				if (field.isSecure) {
					await this.removeVaultSecret(this.buildConfigSecretKey(mailboxId, field.propertyKey));
					// A mailbox which was never started since the key spaces were separated still
					// holds its secrets under the legacy key, so both are cleared.
					await this.removeVaultSecret(
						this.buildLegacyConfigSecretKey(mailboxId, field.propertyKey)
					);
				}
			}
		}

		if (EmailProtocolConnectorStateSchemaFactory.names().includes(connectorType)) {
			const stateSchema = EmailProtocolConnectorStateSchemaFactory.get(connectorType);
			for (const field of stateSchema) {
				if (field.isSecure) {
					await this.removeVaultSecret(this.buildStateSecretKey(mailboxId, field.propertyKey));
				}
			}
		}
	}

	/**
	 * Move a secure configuration property held under its legacy vault key to the current one.
	 * @param mailboxId The mailbox identifier used as the vault key prefix.
	 * @param propertyKey The configuration property the secret holds.
	 * @returns The migrated value, or undefined when no legacy secret was held.
	 * @internal
	 */
	private async migrateLegacyConfigSecret(
		mailboxId: string,
		propertyKey: string
	): Promise<unknown> {
		const legacyKey = this.buildLegacyConfigSecretKey(mailboxId, propertyKey);

		if (!(await this._vaultConnector.secretExists(legacyKey))) {
			return undefined;
		}

		// Mailboxes created before the config and state properties were given their own key
		// spaces still hold their secrets under the shared prefix, so the first hydration after
		// the change moves them across rather than losing the credentials.
		const value = await this._vaultConnector.getSecret(legacyKey);
		await this._vaultConnector.setSecret(this.buildConfigSecretKey(mailboxId, propertyKey), value);
		await this._vaultConnector.removeSecret(legacyKey);

		await this._logging?.log({
			level: "info",
			source: MailboxService.CLASS_NAME,
			ts: Date.now(),
			message: "migratedLegacySecret",
			data: { mailboxId, propertyKey }
		});

		return value;
	}

	/**
	 * Remove a single vault secret if it is present.
	 * @param secretKey The vault key to remove.
	 * @internal
	 */
	private async removeVaultSecret(secretKey: string): Promise<void> {
		if (await this._vaultConnector.secretExists(secretKey)) {
			await this._vaultConnector.removeSecret(secretKey);
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

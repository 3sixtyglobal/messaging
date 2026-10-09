// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys } from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, GeneralError, Is, type IError } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import {
	EmailConsumerFactory,
	EmailProtocolConnectorFactory,
	EmailProtocolConnectorConfigSchemaFactory,
	EmailProtocolConnectorStateSchemaFactory,
	type IEmail,
	type IEmailProtocolConnector,
	type IEmailProtocolConnectorAuthCallback,
	type IMailStorageComponent
} from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@3sixty/vault-models";
import type { Mailbox } from "../src/entities/mailbox.js";
import type { StoredEmail } from "../src/entities/storedEmail.js";
import { MailboxService } from "../src/mailboxService.js";
import { initSchema } from "../src/schema.js";

const TEST_PROTOCOL = "test-protocol";

function makeConnector(): IEmailProtocolConnector {
	return {
		className: () => "TestConnector",
		retrieve: async (instanceId: string, state: unknown) => {},
		retrieveStop: async () => {}
	};
}

function makeVaultConnector(): IVaultConnector {
	const secrets = new Map<string, unknown>();
	return {
		className: () => "TestVault",
		setSecret: async (name: string, data: unknown) => {
			secrets.set(name, data);
		},
		getSecret: async <T>(name: string) => secrets.get(name) as T,
		secretExists: async (name: string) => secrets.has(name),
		removeSecret: async (name: string) => {
			secrets.delete(name);
		}
	} as unknown as IVaultConnector;
}

function makeMailStorage(): IMailStorageComponent {
	return {
		className: () => "TestMailStorage",
		store: async () => "stored-id",
		get: async () => {
			throw new Error("not implemented");
		},
		remove: async () => {},
		query: async () => ({ emails: [] })
	};
}

function makePlatformComponent(): {
	className: () => string;
	execute: (method: () => Promise<void>) => Promise<void>;
} {
	return {
		className: () => "TestPlatform",
		execute: async (method: () => Promise<void>) => method()
	};
}

const TEST_CONTEXT = {
	[ContextIdKeys.Tenant]: "test-tenant",
	[ContextIdKeys.Node]: "test-node",
	[HttpContextIdKeys.PublicOrigin]: "https://app.example.com"
};

async function runWithContext<T>(fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run(TEST_CONTEXT, fn);
}

async function runWithoutOriginContext<T>(fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run(
		{ [ContextIdKeys.Tenant]: "test-tenant", [ContextIdKeys.Node]: "test-node" },
		fn
	);
}

describe("MailboxService", () => {
	let mailboxStorage: MemoryEntityStorageConnector<Mailbox>;
	let emailStorage: MemoryEntityStorageConnector<StoredEmail>;
	let service: MailboxService;

	beforeEach(() => {
		initSchema();

		mailboxStorage = new MemoryEntityStorageConnector<Mailbox>({
			entitySchema: nameof<Mailbox>(),
			config: { storageKey: nameof<Mailbox>() }
		});
		emailStorage = new MemoryEntityStorageConnector<StoredEmail>({
			entitySchema: nameof<StoredEmail>(),
			config: { storageKey: nameof<StoredEmail>() }
		});

		EntityStorageConnectorFactory.register("mailbox", () => mailboxStorage);
		EntityStorageConnectorFactory.register("stored-email", () => emailStorage);

		VaultConnectorFactory.register("vault", makeVaultConnector);
		ComponentFactory.register("mail-storage", makeMailStorage);
		ComponentFactory.register("platform", makePlatformComponent);

		EmailProtocolConnectorFactory.register(TEST_PROTOCOL, () => makeConnector());
		EmailProtocolConnectorConfigSchemaFactory.register(TEST_PROTOCOL, () => []);

		service = new MailboxService({
			mailboxEntityStorageType: "mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage"
		});
	});

	// The connector carries the tenant and an unpredictable nonce alongside the mailbox
	// identifier, so the callback reads the partition straight out of the state it is handed back
	// and a caller which was never given the URL cannot forge one.
	async function correlationState(id: string): Promise<string> {
		const stored = await mailboxStorage.get(id);
		return [TEST_CONTEXT[ContextIdKeys.Tenant], id, stored?.authNonce].join("/");
	}

	test("can construct", () => {
		expect(service).toBeDefined();
		expect(service.className()).toBe("MailboxService");
	});

	test("createMailbox creates a mailbox and returns an id", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Test Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	});

	test("getMailbox returns the created mailbox", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Test Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		const mailbox = await service.getMailbox(id);
		expect(mailbox.id).toBe(id);
		expect(mailbox.name).toBe("Test Mailbox");
		expect(mailbox.connectorType).toBe(TEST_PROTOCOL);
	});

	test("getMailbox throws for unknown id", async () => {
		await expect(service.getMailbox("unknown")).rejects.toMatchObject({ name: "NotFoundError" });
	});

	test("listMailboxes returns created mailboxes", async () => {
		await runWithContext(async () =>
			service.createMailbox({
				name: "Mailbox A",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		await runWithContext(async () =>
			service.createMailbox({
				name: "Mailbox B",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		const result = await service.listMailboxes();
		expect(result.mailboxes.length).toBeGreaterThanOrEqual(2);
	});

	test("removeMailbox deletes the mailbox", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "To Remove",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		await service.removeMailbox(id);
		await expect(service.getMailbox(id)).rejects.toMatchObject({ name: "NotFoundError" });
	});

	test("removeMailbox throws for unknown id", async () => {
		await expect(service.removeMailbox("unknown")).rejects.toMatchObject({ name: "NotFoundError" });
	});

	test("updateMailbox updates the mailbox fields", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Original",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		const mailbox = await service.getMailbox(id);
		await service.updateMailbox({ ...mailbox, name: "Updated" });
		const updated = await service.getMailbox(id);
		expect(updated.name).toBe("Updated");
	});

	test("retrieval callback stores emails", async () => {
		const storedEmails: IEmail[] = [];

		ComponentFactory.register("mail-storage-capture", () => ({
			className: () => "CaptureMailStorage",
			store: async (mailboxId: string, email: IEmail) => {
				storedEmails.push(email);
				return "id";
			},
			get: async () => {
				throw new Error("not implemented");
			},
			remove: async () => {},
			query: async () => ({ emails: [] })
		}));

		const testEmail: IEmail = {
			messageId: "<abc123.def456@test.example.com>",
			from: { address: "a@b.com" },
			to: [{ address: "c@d.com" }],
			subject: "Hello",
			date: new Date().toISOString()
		};

		type RetrievalCb = (mailboxId: string, msg: IEmail, state: unknown) => Promise<boolean>;
		let retrievalCb: RetrievalCb | undefined;

		EmailProtocolConnectorFactory.register("capture-protocol", () => ({
			className: () => "CaptureConnector",
			retrieve: async (instanceId: string, state: unknown, authCb: unknown, cb: RetrievalCb) => {
				retrievalCb = cb;
			},
			retrieveStop: async () => {}
		}));

		const captureService = new MailboxService({
			mailboxEntityStorageType: "mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage-capture"
		});

		await runWithContext(async () =>
			captureService.createMailbox({
				name: "Capture Mailbox",
				connectorType: "capture-protocol",
				enabled: true,
				config: undefined
			})
		);

		expect(retrievalCb).toBeDefined();
		if (retrievalCb !== undefined) {
			await retrievalCb("test-mailbox-id", testEmail, {});
		}
		expect(storedEmails).toHaveLength(1);
		expect(storedEmails[0].subject).toBe("Hello");
	});

	test("retrieval callback skips a message which cannot be stored so ingestion continues", async () => {
		const poison: IEmail = { subject: "Poison", messageId: "<poison@example.com>" };
		const normal: IEmail = { subject: "Normal", messageId: "<normal@example.com>" };
		const inbox: IEmail[] = [poison, normal];
		const storedEmails: IEmail[] = [];

		ComponentFactory.register("mail-storage-poison", () => ({
			className: () => "PoisonMailStorage",
			store: async (mailboxId: string, email: IEmail) => {
				if (email.subject === "Poison") {
					throw new GeneralError("EntitySchemaHelper", "maxLengthExceeded", {
						property: "references",
						maxLength: 2048,
						length: 3000
					});
				}
				storedEmails.push(email);
				return "id";
			},
			get: async () => {
				throw new Error("not implemented");
			},
			remove: async () => {},
			query: async () => ({ emails: [] })
		}));

		type RetrievalCb = (mailboxId: string, msg: IEmail, state: unknown) => Promise<boolean>;
		let retrievalCb: RetrievalCb | undefined;

		EmailProtocolConnectorFactory.register("poison-protocol", () => ({
			className: () => "PoisonConnector",
			retrieve: async (instanceId: string, state: unknown, authCb: unknown, cb: RetrievalCb) => {
				retrievalCb = cb;
			},
			retrieveStop: async () => {}
		}));

		const poisonService = new MailboxService({
			mailboxEntityStorageType: "mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage-poison"
		});

		const { id } = await runWithContext(async () =>
			poisonService.createMailbox({
				name: "Poison Mailbox",
				connectorType: "poison-protocol",
				enabled: true,
				config: undefined
			})
		);

		expect(retrievalCb).toBeDefined();

		// Mirrors the protocol connectors: the cursor moves on after an accepted message and
		// rewinds to the last accepted one when the callback returns false.
		let cursor = 0;
		const fetched: (string | undefined)[] = [];
		const poll = async (): Promise<void> => {
			for (let index = cursor; index < inbox.length; index++) {
				fetched.push(inbox[index].subject);
				const accepted = await retrievalCb?.(id, inbox[index], { cursor: index + 1 });
				if (accepted !== true) {
					return;
				}
				cursor = index + 1;
			}
		};

		await poll();
		await poll();

		// Without the skip the second poll fetches the poison message again and never reaches
		// the one behind it.
		expect(fetched).toEqual(["Poison", "Normal"]);
		expect(cursor).toBe(2);
		expect(storedEmails.map(email => email.subject)).toEqual(["Normal"]);
	});

	test("retrieval callback records a message it could not store on the mailbox", async () => {
		ComponentFactory.register("mail-storage-rejecting", () => ({
			className: () => "RejectingMailStorage",
			store: async () => {
				throw new GeneralError("EntitySchemaHelper", "maxLengthExceeded", {
					property: "references",
					maxLength: 2048,
					length: 3000
				});
			},
			get: async () => {
				throw new Error("not implemented");
			},
			remove: async () => {},
			query: async () => ({ emails: [] })
		}));

		type RetrievalCb = (mailboxId: string, msg: IEmail, state: unknown) => Promise<boolean>;
		let retrievalCb: RetrievalCb | undefined;

		EmailProtocolConnectorFactory.register("rejecting-protocol", () => ({
			className: () => "RejectingConnector",
			retrieve: async (instanceId: string, state: unknown, authCb: unknown, cb: RetrievalCb) => {
				retrievalCb = cb;
			},
			retrieveStop: async () => {}
		}));

		const rejectingService = new MailboxService({
			mailboxEntityStorageType: "mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage-rejecting"
		});

		const { id } = await runWithContext(async () =>
			rejectingService.createMailbox({
				name: "Rejecting Mailbox",
				connectorType: "rejecting-protocol",
				enabled: true,
				config: undefined
			})
		);

		const accepted = await retrievalCb?.(id, { subject: "Oversized" }, {});

		// Reported as accepted so the connector does not rewind its cursor onto the message.
		expect(accepted).toBe(true);

		const mailbox = await mailboxStorage.get(id);
		expect(mailbox?.retrievalError).toMatchObject({
			name: "GeneralError",
			message: "entitySchemaHelper.maxLengthExceeded"
		});
	});

	test("updateMailbox throws when connectorType is changed", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Test Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: undefined
			})
		);
		const mailbox = await service.getMailbox(id);
		await expect(
			service.updateMailbox({ ...mailbox, connectorType: "other-protocol" })
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "mailboxService.connectorTypeCannotChange"
		});
	});

	test("createMailbox throws for an unregistered connectorType and stores nothing", async () => {
		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		const setSecretSpy = vi.spyOn(vault, "setSecret");

		await expect(
			runWithContext(async () =>
				service.createMailbox({
					name: "Unknown Mailbox",
					connectorType: "unregistered-protocol",
					enabled: false,
					config: { host: "mail.example.com", password: "hunter2" }
				})
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "mailboxService.unknownConnectorType",
			properties: { connectorType: "unregistered-protocol" }
		});

		const stored = await mailboxStorage.query();
		expect(stored.entities.some(entity => entity.name === "Unknown Mailbox")).toBe(false);
		expect(setSecretSpy).not.toHaveBeenCalled();
	});

	test("updateMailbox throws when the connectorType is no longer registered", async () => {
		EmailProtocolConnectorFactory.register("removable-protocol", () => makeConnector());

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Removable Mailbox",
				connectorType: "removable-protocol",
				enabled: false,
				config: { host: "mail.example.com" }
			})
		);
		const mailbox = await service.getMailbox(id);

		EmailProtocolConnectorFactory.unregister("removable-protocol");

		await expect(
			service.updateMailbox({ ...mailbox, config: { host: "mail.other.com", password: "hunter2" } })
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "mailboxService.unknownConnectorType",
			properties: { connectorType: "removable-protocol" }
		});

		const stored = await mailboxStorage.get(id);
		expect(stored?.config).toEqual({ host: "mail.example.com" });
	});

	test("createMailbox stores config as-is for a registered connector without a schema", async () => {
		EmailProtocolConnectorFactory.register("schemaless-protocol", () => makeConnector());

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Schemaless Mailbox",
				connectorType: "schemaless-protocol",
				enabled: false,
				config: { host: "mail.example.com" }
			})
		);

		const stored = await mailboxStorage.get(id);
		expect(stored?.config).toEqual({ host: "mail.example.com" });
	});

	test("updateMailbox stops the connector when enabled is set to false", async () => {
		let stopped = false;
		EmailProtocolConnectorFactory.register("stoppable-protocol", () => ({
			className: () => "StoppableConnector",
			retrieve: async () => {},
			retrieveStop: async () => {
				stopped = true;
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("stoppable-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Active Mailbox",
				connectorType: "stoppable-protocol",
				enabled: true,
				config: undefined
			})
		);
		const mailbox = await service.getMailbox(id);
		await service.updateMailbox({ ...mailbox, enabled: false });
		expect(stopped).toBe(true);
		const updated = await service.getMailbox(id);
		expect(updated.enabled).toBe(false);
	});

	test("createMailbox strips secure config fields and stores them in the vault", async () => {
		EmailProtocolConnectorConfigSchemaFactory.register(TEST_PROTOCOL, () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Secure Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: { host: "mail.example.com", password: "hunter2" }
			})
		);

		const stored = await mailboxStorage.get(id);
		expect(stored?.config).toMatchObject({ host: "mail.example.com" });
		expect((stored?.config as { password?: string } | undefined)?.password).toBeUndefined();
		expect(await vault.secretExists(`mailbox:${id}/config/password`)).toBe(true);
		expect(await vault.getSecret(`mailbox:${id}/config/password`)).toBe("hunter2");
	});

	test("removeMailbox removes secure config fields from the vault", async () => {
		EmailProtocolConnectorConfigSchemaFactory.register(TEST_PROTOCOL, () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Secure Mailbox To Remove",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: { password: "hunter2" }
			})
		);

		expect(await vault.secretExists(`mailbox:${id}/config/password`)).toBe(true);

		await service.removeMailbox(id);

		expect(await vault.secretExists(`mailbox:${id}/config/password`)).toBe(false);
	});

	test("start() restores secure config from vault and skips requiresAuth mailboxes", async () => {
		const retrieveCalls: { instanceId: string; config: unknown }[] = [];

		EmailProtocolConnectorFactory.register("secure-protocol", ((args?: { config?: unknown }) => ({
			className: () => "SecureConnector",
			retrieve: async (instanceId: string) => {
				retrieveCalls.push({ instanceId, config: args?.config });
			},
			retrieveStop: async () => {}
		})) as unknown as (args?: unknown) => IEmailProtocolConnector);
		EmailProtocolConnectorConfigSchemaFactory.register("secure-protocol", () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		await runWithContext(async () => {
			await mailboxStorage.set({
				id: "secure-enabled-id",
				name: "Secure Enabled",
				connectorType: "secure-protocol",
				config: { user: "bob" },
				enabled: true,
				tenantId: TEST_CONTEXT[ContextIdKeys.Tenant],
				nodeId: TEST_CONTEXT[ContextIdKeys.Node],
				publicOrigin: TEST_CONTEXT[HttpContextIdKeys.PublicOrigin]
			});

			await mailboxStorage.set({
				id: "auth-halted-id",
				name: "Auth Halted",
				connectorType: "secure-protocol",
				config: { user: "alice" },
				enabled: true,
				requiresAuth: true,
				tenantId: TEST_CONTEXT[ContextIdKeys.Tenant],
				nodeId: TEST_CONTEXT[ContextIdKeys.Node],
				publicOrigin: TEST_CONTEXT[HttpContextIdKeys.PublicOrigin]
			});

			await vault.setSecret("mailbox:secure-enabled-id/config/password", "hunter2");
		});

		// No origin in context here, the callback URI comes from the one captured on the mailbox.
		await service.start();

		expect(retrieveCalls).toHaveLength(1);
		expect(retrieveCalls[0].instanceId).toBe("secure-enabled-id");
		expect(retrieveCalls[0].config).toMatchObject({ user: "bob", password: "hunter2" });
	});

	test("start() enumerates tenants using the platform component", async () => {
		const partitionedStorage = new MemoryEntityStorageConnector<Mailbox>({
			entitySchema: nameof<Mailbox>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "partitioned-mailbox" }
		});
		EntityStorageConnectorFactory.register("partitioned-mailbox", () => partitionedStorage);

		const tenants = ["tenant-a", "tenant-b"];
		const startedTenants: string[] = [];

		EmailProtocolConnectorFactory.register("tenant-protocol", () => ({
			className: () => "TenantConnector",
			retrieve: async () => {
				const ctx = await ContextIdStore.getContextIds();
				startedTenants.push((ctx?.[ContextIdKeys.Tenant] as string) ?? "");
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("tenant-protocol", () => []);

		ComponentFactory.register("tenant-platform", () => ({
			className: () => "TenantPlatform",
			isMultiTenant: () => true,
			execute: async (method: () => Promise<void>) => {
				// Mirrors PlatformService, which layers the tenant over the ambient context.
				const baseContextIds = (await ContextIdStore.getContextIds()) ?? {};
				for (const tenant of tenants) {
					await ContextIdStore.run({ ...baseContextIds, [ContextIdKeys.Tenant]: tenant }, method);
				}
			},
			getLocalOriginContext: async () => undefined
		}));

		const tenantService = new MailboxService({
			mailboxEntityStorageType: "partitioned-mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage",
			platformComponentType: "tenant-platform"
		});

		for (const tenant of tenants) {
			await ContextIdStore.run(
				{
					[ContextIdKeys.Tenant]: tenant,
					[ContextIdKeys.Node]: "test-node",
					[HttpContextIdKeys.PublicOrigin]: "https://app.example.com"
				},
				async () => {
					const { id } = await tenantService.createMailbox({
						name: `Mailbox for ${tenant}`,
						connectorType: "tenant-protocol",
						enabled: false,
						config: undefined
					});
					const entry = await partitionedStorage.get(id);
					if (entry) {
						entry.enabled = true;
						await partitionedStorage.set(entry);
					}
				}
			);
		}

		await tenantService.start();

		expect(startedTenants.sort()).toEqual(["tenant-a", "tenant-b"]);
	});

	test("auth callback persists the requiresAuth halt and stops the connector", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;
		let stopCalls = 0;

		EmailProtocolConnectorFactory.register("auth-halt-protocol", () => ({
			className: () => "AuthHaltConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {
				stopCalls++;
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("auth-halt-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Auth Halt Mailbox",
				connectorType: "auth-halt-protocol",
				enabled: true,
				config: undefined
			})
		);

		expect(authCallback).toBeDefined();
		const authError: IError = { name: "AuthenticationError", message: "credentials expired" };
		if (authCallback) {
			await authCallback(
				id,
				{ cursor: "abc" },
				true,
				{ authUrl: "https://auth.example.com" },
				authError
			);
		}

		const mailbox = await service.getMailbox(id);
		expect(mailbox.requiresAuth).toBe(true);
		expect(mailbox.authState).toMatchObject({ authUrl: "https://auth.example.com" });
		expect(mailbox.authError).toMatchObject({ message: "credentials expired" });
		expect(mailbox.state).toMatchObject({ cursor: "abc" });
		expect(stopCalls).toBe(1);
	});

	test("retrieval callback notifies all consumers even when one throws", async () => {
		const notified: string[] = [];

		EmailConsumerFactory.register("throwing-consumer", () => ({
			className: () => "ThrowingConsumer",
			onNewMessages: async () => {
				throw new Error("boom");
			}
		}));
		EmailConsumerFactory.register("healthy-consumer", () => ({
			className: () => "HealthyConsumer",
			onNewMessages: async () => {
				notified.push("healthy-consumer");
			}
		}));

		type RetrievalCb = (mailboxId: string, msg: IEmail, state: unknown) => Promise<boolean>;
		let retrievalCb: RetrievalCb | undefined;

		EmailProtocolConnectorFactory.register("consumer-protocol", () => ({
			className: () => "ConsumerConnector",
			retrieve: async (instanceId: string, state: unknown, authCb: unknown, cb: RetrievalCb) => {
				retrievalCb = cb;
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("consumer-protocol", () => []);

		await runWithContext(async () =>
			service.createMailbox({
				name: "Consumer Mailbox",
				connectorType: "consumer-protocol",
				enabled: true,
				config: undefined
			})
		);

		expect(retrievalCb).toBeDefined();
		const testEmail: IEmail = {
			messageId: "<consumer-test@test.example.com>",
			from: { address: "a@b.com" },
			to: [{ address: "c@d.com" }],
			subject: "Consumer Test",
			date: new Date().toISOString()
		};
		if (retrievalCb !== undefined) {
			await expect(retrievalCb("consumer-mailbox", testEmail, {})).resolves.toBe(true);
		}
		expect(notified).toEqual(["healthy-consumer"]);
	});

	test("completeAuth reports through the auth callback and clears the auth halt", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;
		const completeAuthCalls: { instanceId: string; authPayload: unknown }[] = [];
		const completeAuthOptions: unknown[] = [];

		EmailProtocolConnectorFactory.register("consent-protocol", () => ({
			className: () => "ConsentConnector",
			retrieve: async (
				instanceId: string,
				connectorState: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {},
			completeAuth: async (
				instanceId: string,
				authPayload: unknown,
				authOptions: unknown
			): Promise<void> => {
				completeAuthCalls.push({ instanceId, authPayload });
				completeAuthOptions.push(authOptions);
				// The connector continues the workflow through the callback it was given, handing
				// back the issued credentials in its state.
				await authCallback?.(instanceId, { refreshToken: "issued-refresh-token" }, false);
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("consent-protocol", () => [
			{ labelKey: "clientId", propertyKey: "clientId", type: "string" }
		]);
		EmailProtocolConnectorStateSchemaFactory.register("consent-protocol", () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Consent Mailbox",
				connectorType: "consent-protocol",
				enabled: true,
				config: { clientId: "test-client-id" }
			})
		);

		// The connector reports the mailbox as awaiting consent.
		if (authCallback) {
			await authCallback(id, {}, true, { authUrl: "https://accounts.google.com/o/oauth2" });
		}
		expect((await service.getMailbox(id)).requiresAuth).toBe(true);

		// The callback route skips the tenant, so the partition comes from the state instead.
		const payloadState = await correlationState(id);
		await service.completeAuth({ state: payloadState, code: "4/0AeaYSHDauthcode" });

		expect(completeAuthCalls).toEqual([
			{ instanceId: id, authPayload: { state: payloadState, code: "4/0AeaYSHDauthcode" } }
		]);
		expect(completeAuthOptions).toEqual([
			{
				callbackUri: `https://app.example.com${MailboxService.DEFAULT_AUTH_CALLBACK_PATH}`,
				correlationState: payloadState
			}
		]);

		const mailbox = await service.getMailbox(id);
		// The connector reported requiresAuth false, which lifts the halt.
		expect(mailbox.requiresAuth).toBe(false);
		expect(mailbox.authState).toBeUndefined();
		expect(mailbox.authError).toBeUndefined();
		// The issued credential is a secure state property, so it is vaulted rather than left on
		// the entity, and a restarted connector picks it back up from there.
		const stored = await mailboxStorage.get(id);
		expect(stored?.config).toEqual({ clientId: "test-client-id" });
		expect(stored?.state).toEqual({});

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		expect(await vault.getSecret(`mailbox:${id}/state/refreshToken`)).toBe("issued-refresh-token");
	});

	test("auth callback rotates the secure state property and leaves the config secret intact", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;

		EmailProtocolConnectorFactory.register("rotation-protocol", () => ({
			className: () => "RotationConnector",
			retrieve: async (
				instanceId: string,
				connectorState: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("rotation-protocol", () => [
			{ labelKey: "clientId", propertyKey: "clientId", type: "string" },
			{ labelKey: "clientSecret", propertyKey: "clientSecret", type: "string", isSecure: true }
		]);
		EmailProtocolConnectorStateSchemaFactory.register("rotation-protocol", () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Rotation Mailbox",
				connectorType: "rotation-protocol",
				enabled: true,
				config: {
					clientId: "test-client-id",
					clientSecret: "test-client-secret"
				}
			})
		);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		await vault.setSecret(`mailbox:${id}/state/refreshToken`, "original-refresh-token");

		// The connector reissued the token, so the state it reports carries the new one.
		await authCallback?.(id, { refreshToken: "rotated-refresh-token" }, false);

		expect(await vault.getSecret(`mailbox:${id}/state/refreshToken`)).toBe("rotated-refresh-token");
		// The configured secret lives on its own vault key, so a state rotation leaves it alone.
		expect(await vault.getSecret(`mailbox:${id}/config/clientSecret`)).toBe("test-client-secret");

		// Neither secret is written back onto the entity.
		const stored = await mailboxStorage.get(id);
		expect(stored?.config).toEqual({ clientId: "test-client-id" });
		expect(stored?.state).toEqual({});
	});

	test("auth callback keeps the plain state properties on the entity", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;

		EmailProtocolConnectorFactory.register("merge-protocol", () => ({
			className: () => "MergeConnector",
			retrieve: async (
				instanceId: string,
				connectorState: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("merge-protocol", () => [
			{ labelKey: "clientId", propertyKey: "clientId", type: "string" }
		]);
		EmailProtocolConnectorStateSchemaFactory.register("merge-protocol", () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Merge Mailbox",
				connectorType: "merge-protocol",
				enabled: true,
				config: { clientId: "test-client-id" }
			})
		);

		// The sync progress belongs on the entity, only the credential is held back.
		await authCallback?.(
			id,
			{ cursor: "history-2000", refreshToken: "original-refresh-token" },
			false
		);

		const stored = await mailboxStorage.get(id);
		expect(stored?.state).toEqual({ cursor: "history-2000" });

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		expect(await vault.getSecret(`mailbox:${id}/state/refreshToken`)).toBe(
			"original-refresh-token"
		);
	});

	test("auth callback revokes a secure state property the connector no longer reports", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;

		EmailProtocolConnectorFactory.register("revoke-protocol", () => ({
			className: () => "RevokeConnector",
			retrieve: async (
				instanceId: string,
				connectorState: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("revoke-protocol", () => [
			{ labelKey: "clientId", propertyKey: "clientId", type: "string" }
		]);
		EmailProtocolConnectorStateSchemaFactory.register("revoke-protocol", () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Revoke Mailbox",
				connectorType: "revoke-protocol",
				enabled: true,
				config: { clientId: "test-client-id" }
			})
		);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		await vault.setSecret(`mailbox:${id}/state/refreshToken`, "stale-refresh-token");

		// The connector reports the stored credential as revoked by dropping it from the state.
		await authCallback?.(id, { cursor: "history-2000" }, true, {
			authUrl: "https://accounts.google.com/o/oauth2"
		});

		// The secret is gone rather than left behind, so a restart finds no token at all and the
		// connector asks for consent again.
		expect(await vault.secretExists(`mailbox:${id}/state/refreshToken`)).toBe(false);

		const stored = await mailboxStorage.get(id);
		expect(stored?.state).toEqual({ cursor: "history-2000" });
		expect(stored?.requiresAuth).toBe(true);
	});

	test("completeAuth throws for a connector with no authentication flow", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;
		EmailProtocolConnectorFactory.register("no-auth-protocol", () => ({
			className: () => "NoAuthConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("no-auth-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Test Mailbox",
				connectorType: "no-auth-protocol",
				enabled: true,
				config: undefined
			})
		);
		if (authCallback) {
			await authCallback(id, {}, true);
		}

		await expect(
			service.completeAuth({ state: await correlationState(id), code: "abc" })
		).rejects.toThrow("mailboxService.authNotSupported");
	});

	test("completeAuth throws when the mailbox is not awaiting authentication", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Test Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);

		// A replayed or stale callback must not disturb a mailbox which is already polling.
		await expect(
			service.completeAuth({ state: await correlationState(id), code: "abc" })
		).rejects.toThrow("mailboxService.authNotPending");
	});

	test("completeAuth throws when the state correlates to no mailbox", async () => {
		await expect(
			service.completeAuth({ state: "test-tenant/missing-id/missing-nonce", code: "abc" })
		).rejects.toThrow("mailboxService.mailboxNotFound");
	});

	test("completeAuth throws when the payload carries no state", async () => {
		await expect(service.completeAuth({ code: "abc" })).rejects.toThrow("guard.string");
	});

	test("passes the configured auth callback URI to the connector", async () => {
		const retrieveOptions: unknown[] = [];
		EmailProtocolConnectorFactory.register("callback-protocol", () => ({
			className: () => "CallbackConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback,
				retrievalCb: unknown,
				options: unknown
			) => {
				retrieveOptions.push(options);
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("callback-protocol", () => []);

		const configured = new MailboxService({
			mailboxEntityStorageType: "mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage",
			config: { authCallbackPath: "/custom/authcallback" }
		});

		const { id } = await runWithContext(async () =>
			configured.createMailbox({
				name: "Callback Mailbox",
				connectorType: "callback-protocol",
				enabled: true,
				config: undefined
			})
		);

		// The origin comes from the request context, the config only carries the path.
		expect(retrieveOptions).toEqual([
			{
				callbackUri: "https://app.example.com/custom/authcallback",
				correlationState: await correlationState(id)
			}
		]);
	});

	test("normalises a configured path however its slashes are written", async () => {
		const retrieveOptions: unknown[] = [];
		EmailProtocolConnectorFactory.register("slash-protocol", () => ({
			className: () => "SlashConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback,
				retrievalCb: unknown,
				options: unknown
			) => {
				retrieveOptions.push(options);
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("slash-protocol", () => []);

		const ids: string[] = [];

		for (const authCallbackPath of ["/custom/authcallback/", "custom/authcallback"]) {
			const configured = new MailboxService({
				mailboxEntityStorageType: "mailbox",
				vaultConnectorType: "vault",
				mailStorageComponentType: "mail-storage",
				config: { authCallbackPath }
			});

			const { id } = await runWithContext(async () =>
				configured.createMailbox({
					name: "Slash Mailbox",
					connectorType: "slash-protocol",
					enabled: true,
					config: undefined
				})
			);
			ids.push(id);
		}

		expect(retrieveOptions).toEqual(
			await Promise.all(
				ids.map(async id => ({
					callbackUri: "https://app.example.com/custom/authcallback",
					correlationState: await correlationState(id)
				}))
			)
		);
	});

	test("createMailbox throws when there is no public origin to capture", async () => {
		// A relative callback would be rejected by the provider, so a mailbox is never created
		// without an origin to build one from.
		await expect(
			runWithoutOriginContext(async () =>
				service.createMailbox({
					name: "No Origin Mailbox",
					connectorType: TEST_PROTOCOL,
					enabled: true,
					config: undefined
				})
			)
		).rejects.toThrow("contextIdHelper.contextIdMissing");

		const store = await mailboxStorage.getStore();
		expect(store.some(entry => entry.name === "No Origin Mailbox")).toBe(false);
	});

	test("createMailbox captures the public origin on the mailbox", async () => {
		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Origin Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: undefined
			})
		);

		const stored = await mailboxStorage.get(id);
		expect(stored?.publicOrigin).toBe("https://app.example.com");
	});

	test("startConnector builds the callback URI from the stored origin", async () => {
		const retrieveOptions: unknown[] = [];
		EmailProtocolConnectorFactory.register("stored-origin-protocol", () => ({
			className: () => "StoredOriginConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback,
				retrievalCb: unknown,
				options: unknown
			) => {
				retrieveOptions.push(options);
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("stored-origin-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Stored Origin Mailbox",
				connectorType: "stored-origin-protocol",
				enabled: false,
				config: undefined
			})
		);

		const stored = await mailboxStorage.get(id);
		if (stored) {
			stored.publicOrigin = "https://captured.example.com";
			stored.enabled = true;
			await mailboxStorage.set(stored);
		}

		// No origin in context, so only the captured one can produce this.
		await service.start();

		expect(retrieveOptions).toEqual([
			{
				callbackUri: "https://captured.example.com/mailbox/authcallback",
				correlationState: await correlationState(id)
			}
		]);
	});

	test("defaults the auth callback path when the config omits one", async () => {
		const retrieveOptions: unknown[] = [];
		EmailProtocolConnectorFactory.register("default-callback-protocol", () => ({
			className: () => "DefaultCallbackConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback,
				retrievalCb: unknown,
				options: unknown
			) => {
				retrieveOptions.push(options);
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("default-callback-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Default Callback Mailbox",
				connectorType: "default-callback-protocol",
				enabled: true,
				config: undefined
			})
		);

		expect(MailboxService.DEFAULT_AUTH_CALLBACK_PATH).toBe("/mailbox/authcallback");
		expect(retrieveOptions).toEqual([
			{
				callbackUri: `https://app.example.com${MailboxService.DEFAULT_AUTH_CALLBACK_PATH}`,
				correlationState: await correlationState(id)
			}
		]);
	});

	test("createMailbox returns the URL the connector produced and holds the mailbox", async () => {
		const retrieveCalls: string[] = [];
		const initiateOptions: unknown[] = [];

		EmailProtocolConnectorFactory.register("initiate-protocol", () => ({
			className: () => "InitiateConnector",
			retrieve: async (instanceId: string) => {
				retrieveCalls.push(instanceId);
			},
			retrieveStop: async () => {},
			initiateAuth: async (instanceId: string, state: unknown, options: unknown) => {
				initiateOptions.push(options);
				return { authUrl: "https://accounts.google.com/o/oauth2" };
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("initiate-protocol", () => []);

		const result = await runWithContext(async () =>
			service.createMailbox({
				name: "Initiate Mailbox",
				connectorType: "initiate-protocol",
				enabled: true,
				config: undefined
			})
		);

		// Only the URL goes back to the caller which created the mailbox, not the whole state.
		expect(result.authUrl).toBe("https://accounts.google.com/o/oauth2");
		expect(initiateOptions).toEqual([
			{
				callbackUri: `https://app.example.com${MailboxService.DEFAULT_AUTH_CALLBACK_PATH}`,
				correlationState: await correlationState(result.id)
			}
		]);

		// Nothing can be polled until the flow completes, so no polling loop is started.
		expect(retrieveCalls).toEqual([]);

		// The connector's own state stays on the mailbox so the flow can be picked up again.
		const stored = await mailboxStorage.get(result.id);
		expect(stored?.requiresAuth).toBe(true);
		expect(stored?.authState).toEqual({ authUrl: "https://accounts.google.com/o/oauth2" });
	});

	test("createMailbox starts polling when the connector reports no flow to run", async () => {
		const retrieveCalls: string[] = [];

		EmailProtocolConnectorFactory.register("no-flow-protocol", () => ({
			className: () => "NoFlowConnector",
			retrieve: async (instanceId: string) => {
				retrieveCalls.push(instanceId);
			},
			retrieveStop: async () => {},
			initiateAuth: async () => undefined
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("no-flow-protocol", () => []);

		const result = await runWithContext(async () =>
			service.createMailbox({
				name: "No Flow Mailbox",
				connectorType: "no-flow-protocol",
				enabled: true,
				config: undefined
			})
		);

		expect(result.authUrl).toBeUndefined();
		expect(retrieveCalls).toEqual([result.id]);

		const stored = await mailboxStorage.get(result.id);
		expect(stored?.requiresAuth).toBeUndefined();
	});

	test("completeAuth reads the partition from the state without searching the others", async () => {
		const partitionedStorage = new MemoryEntityStorageConnector<Mailbox>({
			entitySchema: nameof<Mailbox>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "correlated-mailbox" }
		});
		EntityStorageConnectorFactory.register("correlated-mailbox", () => partitionedStorage);

		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;
		const completeAuthCalls: string[] = [];

		EmailProtocolConnectorFactory.register("correlated-protocol", () => ({
			className: () => "CorrelatedConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {},
			completeAuth: async (instanceId: string) => {
				completeAuthCalls.push(instanceId);
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("correlated-protocol", () => []);

		// Any fan-out across the partitions is a failure, the state names the one to read.
		ComponentFactory.register("searching-platform", () => ({
			className: () => "SearchingPlatform",
			isMultiTenant: () => true,
			execute: async () => {
				throw new Error("the partitions must not be searched");
			},
			getLocalOriginContext: async () => undefined
		}));

		const correlated = new MailboxService({
			mailboxEntityStorageType: "correlated-mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage",
			platformComponentType: "searching-platform"
		});

		const { id } = await ContextIdStore.run(
			{
				[ContextIdKeys.Tenant]: "tenant-b",
				[ContextIdKeys.Node]: "test-node",
				[HttpContextIdKeys.PublicOrigin]: "https://app.example.com"
			},
			async () =>
				correlated.createMailbox({
					name: "Correlated Mailbox",
					connectorType: "correlated-protocol",
					enabled: true,
					config: undefined
				})
		);

		await authCallback?.(id, {}, true, { authUrl: "https://accounts.google.com/o/oauth2" });

		const stored = await ContextIdStore.run({ [ContextIdKeys.Tenant]: "tenant-b" }, async () =>
			partitionedStorage.get(id)
		);

		// The callback route carries no tenant, only the node the request reached.
		await ContextIdStore.run({ [ContextIdKeys.Node]: "test-node" }, async () =>
			correlated.completeAuth({
				state: `tenant-b/${id}/${stored?.authNonce}`,
				code: "4/0AeaYSHDauthcode"
			})
		);

		expect(completeAuthCalls).toEqual([id]);
	});

	test("start() restores the secure state property from the vault", async () => {
		const retrieveStates: unknown[] = [];

		EmailProtocolConnectorFactory.register("secure-state-protocol", () => ({
			className: () => "SecureStateConnector",
			retrieve: async (instanceId: string, state: unknown) => {
				retrieveStates.push(state);
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("secure-state-protocol", () => []);
		EmailProtocolConnectorStateSchemaFactory.register("secure-state-protocol", () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		await runWithContext(async () => {
			await mailboxStorage.set({
				id: "secure-state-id",
				name: "Secure State",
				connectorType: "secure-state-protocol",
				state: { cursor: "history-2000" },
				enabled: true,
				tenantId: TEST_CONTEXT[ContextIdKeys.Tenant],
				nodeId: TEST_CONTEXT[ContextIdKeys.Node],
				publicOrigin: TEST_CONTEXT[HttpContextIdKeys.PublicOrigin]
			});

			await vault.setSecret("mailbox:secure-state-id/state/refreshToken", "vaulted-token");
		});

		await service.start();

		// The connector is handed the credential back alongside the state it left off with.
		expect(retrieveStates).toEqual([{ cursor: "history-2000", refreshToken: "vaulted-token" }]);
	});

	test("retrieval callback keeps the secure state property out of entity storage", async () => {
		type RetrievalCb = (
			mailboxId: string,
			msg: IEmail | undefined,
			state: unknown
		) => Promise<boolean>;
		let retrievalCb: RetrievalCb | undefined;

		EmailProtocolConnectorFactory.register("polled-state-protocol", () => ({
			className: () => "PolledStateConnector",
			retrieve: async (instanceId: string, state: unknown, authCb: unknown, cb: RetrievalCb) => {
				retrievalCb = cb;
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("polled-state-protocol", () => []);
		EmailProtocolConnectorStateSchemaFactory.register("polled-state-protocol", () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Polled State Mailbox",
				connectorType: "polled-state-protocol",
				enabled: true,
				config: undefined
			})
		);

		await retrievalCb?.(id, undefined, {
			cursor: "history-2100",
			refreshToken: "polled-refresh-token"
		});

		const stored = await mailboxStorage.get(id);
		expect(stored?.state).toEqual({ cursor: "history-2100" });

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		expect(await vault.getSecret(`mailbox:${id}/state/refreshToken`)).toBe("polled-refresh-token");
	});

	test("removeMailbox removes secure state properties from the vault", async () => {
		EmailProtocolConnectorConfigSchemaFactory.register(TEST_PROTOCOL, () => []);
		EmailProtocolConnectorStateSchemaFactory.register(TEST_PROTOCOL, () => [
			{ labelKey: "refreshToken", propertyKey: "refreshToken", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Secure State To Remove",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: undefined
			})
		);

		await vault.setSecret(`mailbox:${id}/state/refreshToken`, "vaulted-token");

		await service.removeMailbox(id);

		expect(await vault.secretExists(`mailbox:${id}/state/refreshToken`)).toBe(false);
	});

	test("createMailbox stores nothing when the connector rejects the configuration", async () => {
		EmailProtocolConnectorFactory.register("strict-protocol", ((args?: {
			config?: { host?: string };
		}) => {
			if (!Is.stringValue(args?.config?.host)) {
				throw new Error("host is required");
			}
			return {
				className: () => "StrictConnector",
				retrieve: async () => {},
				retrieveStop: async () => {}
			};
		}) as unknown as (args?: unknown) => IEmailProtocolConnector);
		EmailProtocolConnectorConfigSchemaFactory.register("strict-protocol", () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		await expect(
			runWithContext(async () =>
				service.createMailbox({
					name: "Strict Mailbox",
					connectorType: "strict-protocol",
					enabled: true,
					config: { password: "hunter2" }
				})
			)
		).rejects.toThrow("mailboxService.connectorConfigInvalid");

		// Neither the mailbox nor its secret is left behind for a configuration which can never
		// be polled.
		const store = await mailboxStorage.getStore();
		expect(store.some(entry => entry.name === "Strict Mailbox")).toBe(false);
	});

	test("updateMailbox keeps the stored credentials when the update is rejected", async () => {
		EmailProtocolConnectorFactory.register("guarded-protocol", ((args?: {
			config?: { clientSecret?: string };
		}) => {
			if (!Is.stringValue(args?.config?.clientSecret)) {
				throw new Error("clientSecret is required");
			}
			return {
				className: () => "GuardedConnector",
				retrieve: async () => {},
				retrieveStop: async () => {}
			};
		}) as unknown as (args?: unknown) => IEmailProtocolConnector);
		EmailProtocolConnectorConfigSchemaFactory.register("guarded-protocol", () => [
			{ labelKey: "clientSecret", propertyKey: "clientSecret", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Guarded Mailbox",
				connectorType: "guarded-protocol",
				enabled: true,
				config: { clientSecret: "test-client-secret" }
			})
		);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		expect(await vault.secretExists(`mailbox:${id}/config/clientSecret`)).toBe(true);

		// Clearing the configuration would leave the mailbox with no credentials and no connector,
		// so the update is refused before the vaulted secret is touched.
		await expect(
			service.updateMailbox({
				id,
				name: "Guarded Mailbox",
				connectorType: "guarded-protocol",
				enabled: true,
				config: undefined
			})
		).rejects.toThrow("mailboxService.connectorConfigInvalid");

		expect(await vault.getSecret(`mailbox:${id}/config/clientSecret`)).toBe("test-client-secret");
	});

	test("updateMailbox keeps a secure property the caller left out", async () => {
		const retrieveConfigs: unknown[] = [];

		EmailProtocolConnectorFactory.register("kept-protocol", ((args?: { config?: unknown }) => ({
			className: () => "KeptConnector",
			retrieve: async () => {
				retrieveConfigs.push(args?.config);
			},
			retrieveStop: async () => {}
		})) as unknown as (args?: unknown) => IEmailProtocolConnector);
		EmailProtocolConnectorConfigSchemaFactory.register("kept-protocol", () => [
			{ labelKey: "clientId", propertyKey: "clientId", type: "string" },
			{ labelKey: "clientSecret", propertyKey: "clientSecret", type: "string", isSecure: true }
		]);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Kept Mailbox",
				connectorType: "kept-protocol",
				enabled: true,
				config: { clientId: "test-client-id", clientSecret: "test-client-secret" }
			})
		);

		// A caller which read the mailbox back never sees the vaulted secret, so an update made
		// from it must not be treated as clearing the secret.
		await service.updateMailbox({
			id,
			name: "Renamed Mailbox",
			connectorType: "kept-protocol",
			enabled: true,
			config: { clientId: "test-client-id" }
		});

		expect(retrieveConfigs.at(-1)).toMatchObject({
			clientId: "test-client-id",
			clientSecret: "test-client-secret"
		});
	});

	test("updateMailbox starts a new authentication flow and returns its URL", async () => {
		EmailProtocolConnectorFactory.register("reauth-protocol", () => ({
			className: () => "ReauthConnector",
			retrieve: async () => {},
			retrieveStop: async () => {},
			initiateAuth: async () => ({ authUrl: "https://accounts.google.com/o/oauth2" })
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("reauth-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Reauth Mailbox",
				connectorType: "reauth-protocol",
				enabled: false,
				config: undefined
			})
		);

		// Enabling the mailbox replaces the credentials it authenticates with, so the operator is
		// given the URL straight away rather than waiting for a poll to report it.
		const result = await service.updateMailbox({
			id,
			name: "Reauth Mailbox",
			connectorType: "reauth-protocol",
			enabled: true,
			config: undefined
		});

		expect(result.authUrl).toBe("https://accounts.google.com/o/oauth2");

		const stored = await mailboxStorage.get(id);
		expect(stored?.requiresAuth).toBe(true);
	});

	test("completeAuth rejects a callback which does not carry the flow's nonce", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;

		EmailProtocolConnectorFactory.register("nonce-protocol", () => ({
			className: () => "NonceConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {},
			completeAuth: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("nonce-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Nonce Mailbox",
				connectorType: "nonce-protocol",
				enabled: true,
				config: undefined
			})
		);

		await authCallback?.(id, {}, true, { authUrl: "https://accounts.google.com/o/oauth2" });

		// The route is unauthenticated, so a state which was never issued for this flow must not
		// be able to bind the mailbox to an account of the caller's choosing.
		await expect(
			service.completeAuth({ state: `test-tenant/${id}/forged-nonce`, code: "abc" })
		).rejects.toThrow("mailboxService.authStateMismatch");
	});

	test("completeAuth replaces the nonce so the same state cannot be replayed", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;

		EmailProtocolConnectorFactory.register("replay-protocol", () => ({
			className: () => "ReplayConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {},
			completeAuth: async (instanceId: string) => {
				await authCallback?.(instanceId, {}, false);
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("replay-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Replay Mailbox",
				connectorType: "replay-protocol",
				enabled: true,
				config: undefined
			})
		);

		await authCallback?.(id, {}, true, { authUrl: "https://accounts.google.com/o/oauth2" });

		const firstState = await correlationState(id);
		await service.completeAuth({ state: firstState, code: "4/0AeaYSHDauthcode" });

		// The nonce is replaced once it has completed a flow, so a captured state cannot be used
		// again the next time the mailbox is waiting to be authenticated.
		expect(await correlationState(id)).not.toBe(firstState);

		await authCallback?.(id, {}, true, { authUrl: "https://accounts.google.com/o/oauth2" });

		await expect(
			service.completeAuth({ state: firstState, code: "4/0AeaYSHDauthcode" })
		).rejects.toThrow("mailboxService.authStateMismatch");

		// The flow can still be completed with the state the connector is now handing out.
		await service.completeAuth({ state: await correlationState(id), code: "4/0AeaYSHDauthcode" });
		expect((await service.getMailbox(id)).requiresAuth).toBe(false);
	});

	test("completeAuth stops the connector when the exchange fails", async () => {
		let authCallback: IEmailProtocolConnectorAuthCallback | undefined;
		let stopCalls = 0;

		EmailProtocolConnectorFactory.register("failing-consent-protocol", () => ({
			className: () => "FailingConsentConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback
			) => {
				authCallback = authCb;
			},
			retrieveStop: async () => {
				stopCalls++;
			},
			completeAuth: async () => {
				throw new Error("the user denied consent");
			}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("failing-consent-protocol", () => []);

		const { id } = await runWithContext(async () =>
			service.createMailbox({
				name: "Failing Consent Mailbox",
				connectorType: "failing-consent-protocol",
				enabled: true,
				config: undefined
			})
		);

		await authCallback?.(id, {}, true, { authUrl: "https://accounts.google.com/o/oauth2" });
		const stopsBefore = stopCalls;

		await expect(
			service.completeAuth({ state: await correlationState(id), code: "abc" })
		).rejects.toThrow("the user denied consent");

		// The mailbox is still unauthenticated, so nothing is left polling for it.
		expect(stopCalls).toBeGreaterThan(stopsBefore);
		expect((await service.getMailbox(id)).requiresAuth).toBe(true);
	});

	test("start() resumes a mailbox stored without a public origin", async () => {
		const retrieveOptions: unknown[] = [];

		EmailProtocolConnectorFactory.register("no-origin-protocol", () => ({
			className: () => "NoOriginConnector",
			retrieve: async (
				instanceId: string,
				state: unknown,
				authCb: IEmailProtocolConnectorAuthCallback,
				retrievalCb: unknown,
				options: unknown
			) => {
				retrieveOptions.push(options);
			},
			retrieveStop: async () => {}
		}));
		EmailProtocolConnectorConfigSchemaFactory.register("no-origin-protocol", () => []);

		await runWithContext(async () => {
			await mailboxStorage.set({
				id: "no-origin-id",
				name: "No Origin",
				connectorType: "no-origin-protocol",
				enabled: true,
				tenantId: TEST_CONTEXT[ContextIdKeys.Tenant],
				nodeId: TEST_CONTEXT[ContextIdKeys.Node]
			});
		});

		await service.start();

		// A protocol with no authentication flow needs no callback URI, so the mailbox keeps
		// polling rather than failing to resume.
		expect(retrieveOptions).toHaveLength(1);
		expect(retrieveOptions[0]).toMatchObject({ callbackUri: undefined });
	});

	test("start() moves a secret held under its legacy vault key", async () => {
		const retrieveConfigs: unknown[] = [];

		EmailProtocolConnectorFactory.register("legacy-protocol", ((args?: { config?: unknown }) => ({
			className: () => "LegacyConnector",
			retrieve: async () => {
				retrieveConfigs.push(args?.config);
			},
			retrieveStop: async () => {}
		})) as unknown as (args?: unknown) => IEmailProtocolConnector);
		EmailProtocolConnectorConfigSchemaFactory.register("legacy-protocol", () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		await runWithContext(async () => {
			await mailboxStorage.set({
				id: "legacy-secret-id",
				name: "Legacy Secret",
				connectorType: "legacy-protocol",
				enabled: true,
				tenantId: TEST_CONTEXT[ContextIdKeys.Tenant],
				nodeId: TEST_CONTEXT[ContextIdKeys.Node],
				publicOrigin: TEST_CONTEXT[HttpContextIdKeys.PublicOrigin]
			});

			// Written before the config and state properties were given their own key spaces.
			await vault.setSecret("mailbox:legacy-secret-id/password", "hunter2");
		});

		await service.start();

		// The credential is still handed to the connector, and it now lives under the current key.
		expect(retrieveConfigs.at(-1)).toMatchObject({ password: "hunter2" });
		expect(await vault.getSecret("mailbox:legacy-secret-id/config/password")).toBe("hunter2");
		expect(await vault.secretExists("mailbox:legacy-secret-id/password")).toBe(false);
	});

	test("getSchema returns the registered schema for a connector type", async () => {
		EmailProtocolConnectorConfigSchemaFactory.register(TEST_PROTOCOL, () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const schema = await service.getSchema(TEST_PROTOCOL);

		expect(schema).toEqual([
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);
	});

	test("getSchema throws NotFoundError for an unregistered connector type", async () => {
		await expect(service.getSchema("unregistered-protocol")).rejects.toMatchObject({
			name: "NotFoundError",
			message: "mailboxService.schemaNotFound",
			properties: { notFoundId: "unregistered-protocol" }
		});
	});
});

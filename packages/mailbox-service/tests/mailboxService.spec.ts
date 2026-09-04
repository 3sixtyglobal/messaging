// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { ComponentFactory, type IError } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EmailConsumerFactory,
	EmailProtocolConnectorFactory,
	EmailProtocolConnectorSchemaFactory,
	type IEmail,
	type IEmailProtocolConnector,
	type IEmailProtocolConnectorAuthCallback,
	type IMailStorageComponent
} from "@twin.org/mailbox-models";
import { nameof } from "@twin.org/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@twin.org/vault-models";
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
	[ContextIdKeys.Node]: "test-node"
};

async function runWithContext<T>(fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run(TEST_CONTEXT, fn);
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
		EmailProtocolConnectorSchemaFactory.register(TEST_PROTOCOL, () => []);

		service = new MailboxService({
			mailboxEntityStorageType: "mailbox",
			vaultConnectorType: "vault",
			mailStorageComponentType: "mail-storage"
		});
	});

	test("can construct", () => {
		expect(service).toBeDefined();
		expect(service.className()).toBe("MailboxService");
	});

	test("addMailbox creates a mailbox and returns an id", async () => {
		const id = await runWithContext(async () =>
			service.addMailbox({
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
		const id = await runWithContext(async () =>
			service.addMailbox({
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
			service.addMailbox({
				name: "Mailbox A",
				connectorType: TEST_PROTOCOL,
				enabled: true,
				config: undefined
			})
		);
		await runWithContext(async () =>
			service.addMailbox({
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
		const id = await runWithContext(async () =>
			service.addMailbox({
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
		const id = await runWithContext(async () =>
			service.addMailbox({
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
			captureService.addMailbox({
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

	test("updateMailbox throws when connectorType is changed", async () => {
		const id = await runWithContext(async () =>
			service.addMailbox({
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

	test("addMailbox throws for an unregistered connectorType and stores nothing", async () => {
		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");
		const setSecretSpy = vi.spyOn(vault, "setSecret");

		await expect(
			runWithContext(async () =>
				service.addMailbox({
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

		const id = await runWithContext(async () =>
			service.addMailbox({
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

	test("addMailbox stores config as-is for a registered connector without a schema", async () => {
		EmailProtocolConnectorFactory.register("schemaless-protocol", () => makeConnector());

		const id = await runWithContext(async () =>
			service.addMailbox({
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
		EmailProtocolConnectorSchemaFactory.register("stoppable-protocol", () => []);

		const id = await runWithContext(async () =>
			service.addMailbox({
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

	test("addMailbox strips secure config fields and stores them in the vault", async () => {
		EmailProtocolConnectorSchemaFactory.register(TEST_PROTOCOL, () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		const id = await runWithContext(async () =>
			service.addMailbox({
				name: "Secure Mailbox",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: { host: "mail.example.com", password: "hunter2" }
			})
		);

		const stored = await mailboxStorage.get(id);
		expect(stored?.config).toMatchObject({ host: "mail.example.com" });
		expect((stored?.config as { password?: string } | undefined)?.password).toBeUndefined();
		expect(await vault.secretExists(`mailbox:${id}/password`)).toBe(true);
		expect(await vault.getSecret(`mailbox:${id}/password`)).toBe("hunter2");
	});

	test("removeMailbox removes secure config fields from the vault", async () => {
		EmailProtocolConnectorSchemaFactory.register(TEST_PROTOCOL, () => [
			{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
		]);

		const vault = VaultConnectorFactory.get<IVaultConnector>("vault");

		const id = await runWithContext(async () =>
			service.addMailbox({
				name: "Secure Mailbox To Remove",
				connectorType: TEST_PROTOCOL,
				enabled: false,
				config: { password: "hunter2" }
			})
		);

		expect(await vault.secretExists(`mailbox:${id}/password`)).toBe(true);

		await service.removeMailbox(id);

		expect(await vault.secretExists(`mailbox:${id}/password`)).toBe(false);
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
		EmailProtocolConnectorSchemaFactory.register("secure-protocol", () => [
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
				nodeId: TEST_CONTEXT[ContextIdKeys.Node]
			});

			await mailboxStorage.set({
				id: "auth-halted-id",
				name: "Auth Halted",
				connectorType: "secure-protocol",
				config: { user: "alice" },
				enabled: true,
				requiresAuth: true,
				tenantId: TEST_CONTEXT[ContextIdKeys.Tenant],
				nodeId: TEST_CONTEXT[ContextIdKeys.Node]
			});

			await vault.setSecret("mailbox:secure-enabled-id/password", "hunter2");
		});

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
		EmailProtocolConnectorSchemaFactory.register("tenant-protocol", () => []);

		ComponentFactory.register("tenant-platform", () => ({
			className: () => "TenantPlatform",
			isMultiTenant: () => true,
			execute: async (method: () => Promise<void>) => {
				for (const tenant of tenants) {
					await ContextIdStore.run(
						{ [ContextIdKeys.Tenant]: tenant, [ContextIdKeys.Node]: "test-node" },
						method
					);
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
				{ [ContextIdKeys.Tenant]: tenant, [ContextIdKeys.Node]: "test-node" },
				async () => {
					const id = await tenantService.addMailbox({
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
		EmailProtocolConnectorSchemaFactory.register("auth-halt-protocol", () => []);

		const id = await runWithContext(async () =>
			service.addMailbox({
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
				{ url: "https://auth.example.com" },
				authError
			);
		}

		const mailbox = await service.getMailbox(id);
		expect(mailbox.requiresAuth).toBe(true);
		expect(mailbox.authState).toMatchObject({ url: "https://auth.example.com" });
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
		EmailProtocolConnectorSchemaFactory.register("consumer-protocol", () => []);

		await runWithContext(async () =>
			service.addMailbox({
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

	test("getSchema returns the registered schema for a connector type", async () => {
		EmailProtocolConnectorSchemaFactory.register(TEST_PROTOCOL, () => [
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

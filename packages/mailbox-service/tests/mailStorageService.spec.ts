// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformComponent } from "@3sixty/api-models";
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import { ComparisonOperator } from "@3sixty/entity";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import type { IEmail } from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import type { StoredEmail } from "../src/entities/storedEmail.js";
import { MailStorageService } from "../src/mailStorageService.js";
import { initSchema } from "../src/schema.js";

const TEST_MAILBOX_ID = "mailbox-1";

const TEST_EMAIL: IEmail = {
	messageId: "<abc123.def456@example.com>",
	from: { name: "Sender", address: "sender@example.com" },
	to: [{ address: "receiver@example.com" }],
	subject: "Test subject",
	date: "2026-01-01T00:00:00.000Z"
};

function makeScheduler(): {
	scheduler: ITaskSchedulerComponent;
	addTask: ReturnType<typeof vi.fn>;
	removeTask: ReturnType<typeof vi.fn>;
	runPending: () => Promise<void>;
} {
	let pending: (() => Promise<void>) | undefined;
	const addTask = vi.fn(async (taskId: string, times: unknown[], callback: () => Promise<void>) => {
		pending = callback;
	});
	const removeTask = vi.fn(async () => {
		pending = undefined;
	});
	const scheduler: ITaskSchedulerComponent = {
		className: () => "TestScheduler",
		addTask,
		removeTask,
		tasksInfo: async () => ({ tasks: [] })
	} as unknown as ITaskSchedulerComponent;

	return {
		scheduler,
		addTask,
		removeTask,
		runPending: async () => {
			await pending?.();
		}
	};
}

function makePlatformComponent(): IPlatformComponent {
	return {
		className: () => "TestPlatform",
		isMultiTenant: () => false,
		execute: async (method: () => Promise<void>) => method(),
		getLocalOriginContext: async () => undefined
	};
}

describe("MailStorageService", () => {
	let emailStorage: MemoryEntityStorageConnector<StoredEmail>;
	let testScheduler: ReturnType<typeof makeScheduler>;
	let service: MailStorageService;

	beforeEach(() => {
		initSchema();
		emailStorage = new MemoryEntityStorageConnector<StoredEmail>({
			entitySchema: nameof<StoredEmail>(),
			config: { storageKey: nameof<StoredEmail>() }
		});
		EntityStorageConnectorFactory.register("stored-email", () => emailStorage);
		testScheduler = makeScheduler();
		ComponentFactory.register("task-scheduler", () => testScheduler.scheduler);
		ComponentFactory.register("platform", makePlatformComponent);
		service = new MailStorageService({ storedEmailEntityStorageType: "stored-email" });
	});

	test("can construct", () => {
		expect(service).toBeDefined();
		expect(service.className()).toBe("MailStorageService");
	});

	test("store saves email and returns an id", async () => {
		const id = await service.store(TEST_MAILBOX_ID, TEST_EMAIL);
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	});

	test("get returns a stored email", async () => {
		const id = await service.store(TEST_MAILBOX_ID, TEST_EMAIL);
		const stored = await service.get(id);
		expect(stored.id).toBe(id);
		expect(stored.mailboxId).toBe(TEST_MAILBOX_ID);
		expect(stored.subject).toBe(TEST_EMAIL.subject);
	});

	test("get throws when email does not exist", async () => {
		await expect(service.get("nonexistent")).rejects.toMatchObject({
			name: "NotFoundError"
		});
	});

	test("remove deletes a stored email", async () => {
		const id = await service.store(TEST_MAILBOX_ID, TEST_EMAIL);
		await service.remove(id);
		await expect(service.get(id)).rejects.toMatchObject({ name: "NotFoundError" });
	});

	test("remove throws when email does not exist", async () => {
		await expect(service.remove("nonexistent")).rejects.toMatchObject({ name: "NotFoundError" });
	});

	test("query returns emails after the given epoch", async () => {
		const before = new Date(Date.now() - 1000).toISOString();
		const id = await service.store(TEST_MAILBOX_ID, TEST_EMAIL);
		const result = await service.query(before);
		expect(result.emails.some(e => e.id === id)).toBe(true);
	});

	test("query filters by mailboxId", async () => {
		const before = new Date(Date.now() - 1000).toISOString();
		await service.store("other-mailbox", TEST_EMAIL);
		const id = await service.store(TEST_MAILBOX_ID, TEST_EMAIL);
		const result = await service.query(before, TEST_MAILBOX_ID);
		expect(result.emails.every(e => e.mailboxId === TEST_MAILBOX_ID)).toBe(true);
		expect(result.emails.some(e => e.id === id)).toBe(true);
	});

	test("retention task removes all expired email ids across query pages", async () => {
		const now = new Date("2026-02-01T00:00:00.000Z");
		vi.spyOn(Date, "now").mockReturnValue(now.getTime());
		const querySpy = vi
			.spyOn(emailStorage, "query")
			.mockResolvedValueOnce({ entities: [{ id: "old-1" }], cursor: "next" })
			.mockResolvedValueOnce({ entities: [{ id: "old-2" }] });
		const removeBatchSpy = vi.spyOn(emailStorage, "removeBatch").mockResolvedValue();
		service = new MailStorageService({
			storedEmailEntityStorageType: "stored-email",
			config: { retentionMinutes: 30 }
		});

		await service.start();
		await testScheduler.runPending();

		expect(testScheduler.addTask).toHaveBeenCalledWith(
			"mail-storage-retention",
			[{ nextTriggerTime: Date.now(), intervalMinutes: 30 }],
			expect.any(Function)
		);
		// 30 minutes before the mocked now, not 30 days.
		expect(querySpy).toHaveBeenNthCalledWith(
			1,
			{
				conditions: [
					{
						property: "receivedAt",
						comparison: ComparisonOperator.LessThan,
						value: "2026-01-31T23:30:00.000Z"
					}
				]
			},
			undefined,
			["id"],
			undefined
		);
		expect(querySpy).toHaveBeenNthCalledWith(2, expect.any(Object), undefined, ["id"], "next");
		expect(removeBatchSpy).toHaveBeenCalledWith(["old-1", "old-2"]);
	});

	test("retention period is measured in minutes", async () => {
		const retentionMinutes = 30;
		const minutesAgo = (minutes: number): string => {
			const offsetMs = minutes * 60_000;
			return new Date(Date.now() - offsetMs).toISOString();
		};

		const minuteScheduler = makeScheduler();
		ComponentFactory.register("task-scheduler", () => minuteScheduler.scheduler);

		const minuteService = new MailStorageService({
			storedEmailEntityStorageType: "stored-email",
			config: { retentionMinutes }
		});

		const expiredId = await minuteService.store(TEST_MAILBOX_ID, TEST_EMAIL);
		const liveId = await minuteService.store(TEST_MAILBOX_ID, TEST_EMAIL);

		const expired = await emailStorage.get(expiredId);
		if (expired) {
			expired.receivedAt = minutesAgo(retentionMinutes + 1);
			await emailStorage.set(expired);
		}
		const live = await emailStorage.get(liveId);
		if (live) {
			live.receivedAt = minutesAgo(retentionMinutes - 1);
			await emailStorage.set(live);
		}

		await minuteService.start();
		await minuteScheduler.runPending();

		// Just over the window goes, just under it stays.
		await expect(minuteService.get(expiredId)).rejects.toThrow("mailStorageService.emailNotFound");
		await expect(minuteService.get(liveId)).resolves.toBeDefined();
	});

	test("retention sweep runs for every tenant partition", async () => {
		const tenants = ["tenant-a", "tenant-b"];
		const sweptTenants: string[] = [];

		const partitionedStorage = new MemoryEntityStorageConnector<StoredEmail>({
			entitySchema: nameof<StoredEmail>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "partitioned-stored-email" }
		});
		EntityStorageConnectorFactory.register("partitioned-stored-email", () => partitionedStorage);

		ComponentFactory.register("tenant-platform", () => {
			const platform = {
				className: () => "TenantPlatform",
				isMultiTenant: () => true,
				execute: async (method: () => Promise<void>) => {
					for (const tenant of tenants) {
						await ContextIdStore.run({ [ContextIdKeys.Tenant]: tenant }, async () => {
							const contextIds = await ContextIdStore.getContextIds();
							sweptTenants.push((contextIds?.[ContextIdKeys.Tenant] as string) ?? "");
							await method();
						});
					}
				},
				getLocalOriginContext: async () => undefined
			};
			return platform;
		});

		const partitionedScheduler = makeScheduler();
		ComponentFactory.register("task-scheduler", () => partitionedScheduler.scheduler);

		const partitionedService = new MailStorageService({
			storedEmailEntityStorageType: "partitioned-stored-email",
			platformComponentType: "tenant-platform",
			config: { retentionMinutes: 30 }
		});

		// One expired email per tenant, each in its own partition.
		for (const tenant of tenants) {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: tenant }, async () => {
				const id = await partitionedService.store(TEST_MAILBOX_ID, TEST_EMAIL);
				const stored = await partitionedStorage.get(id);
				if (stored) {
					stored.receivedAt = new Date(0).toISOString();
					await partitionedStorage.set(stored);
				}
			});
		}

		// The sweep fires with no tenant in context, so only the platform fan-out can reach them.
		await partitionedService.start();
		await partitionedScheduler.runPending();

		expect(sweptTenants).toEqual(tenants);

		for (const tenant of tenants) {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: tenant }, async () => {
				const remaining = await partitionedService.query(new Date(0).toISOString());
				expect(remaining.emails).toHaveLength(0);
			});
		}
	});

	test("stop removes the configured retention task", async () => {
		service = new MailStorageService({
			storedEmailEntityStorageType: "stored-email",
			config: { retentionMinutes: 30 }
		});

		await service.stop();

		expect(testScheduler.removeTask).toHaveBeenCalledWith("mail-storage-retention");
	});

	test("store truncates an oversized References header instead of rejecting the message", async () => {
		const references = `<${"a".repeat(3000)}@example.com>`;

		const id = await service.store(TEST_MAILBOX_ID, {
			...TEST_EMAIL,
			references,
			headers: [{ key: "references", originalKey: "References", value: references }]
		});

		const stored = await service.get(id);
		expect(stored.references).toHaveLength(2048);
		expect(stored.references).toBe(references.slice(0, 2048));

		// The header it derives from is stored whole, so nothing is lost.
		expect(stored.headers?.[0].value).toBe(references);
	});

	test("store truncates every bounded header property to the length its schema allows", async () => {
		const id = await service.store(TEST_MAILBOX_ID, {
			...TEST_EMAIL,
			messageId: "m".repeat(400),
			inReplyTo: "r".repeat(400),
			references: "f".repeat(3000),
			subject: "s".repeat(2000),
			returnPath: "p".repeat(400),
			deliveredTo: "d".repeat(400),
			date: "t".repeat(200)
		});

		const stored = await service.get(id);
		expect(stored.messageId).toHaveLength(255);
		expect(stored.inReplyTo).toHaveLength(255);
		expect(stored.references).toHaveLength(2048);
		expect(stored.subject).toHaveLength(1024);
		expect(stored.returnPath).toHaveLength(254);
		expect(stored.deliveredTo).toHaveLength(254);
		expect(stored.date).toHaveLength(64);
	});

	test("store leaves properties within their bounds untouched", async () => {
		const id = await service.store(TEST_MAILBOX_ID, TEST_EMAIL);

		const stored = await service.get(id);
		expect(stored.messageId).toBe(TEST_EMAIL.messageId);
		expect(stored.subject).toBe(TEST_EMAIL.subject);
		expect(stored.date).toBe(TEST_EMAIL.date);
	});

	test("store logs the properties it truncated", async () => {
		const log = vi.fn(async () => {});
		const logging: ILoggingComponent = {
			className: () => "TestLogging",
			log,
			query: async () => ({ entities: [] })
		};
		ComponentFactory.register("mail-storage-truncate-logging", () => logging);
		service = new MailStorageService({
			storedEmailEntityStorageType: "stored-email",
			loggingComponentType: "mail-storage-truncate-logging"
		});

		const id = await service.store(TEST_MAILBOX_ID, {
			...TEST_EMAIL,
			subject: "s".repeat(2000),
			references: "f".repeat(3000)
		});

		expect(log).toHaveBeenCalledWith({
			level: "warn",
			source: "MailStorageService",
			ts: expect.any(Number),
			message: "emailPropertiesTruncated",
			data: { mailboxId: TEST_MAILBOX_ID, emailId: id, properties: "references, subject" }
		});
	});

	test("retention task logs cleanup failures", async () => {
		const log = vi.fn(async () => {});
		const logging: ILoggingComponent = {
			className: () => "TestLogging",
			log,
			query: async () => ({ entities: [] })
		};
		ComponentFactory.register("mail-storage-logging", () => logging);
		vi.spyOn(emailStorage, "query").mockRejectedValue(new Error("cleanup failed"));
		service = new MailStorageService({
			storedEmailEntityStorageType: "stored-email",
			loggingComponentType: "mail-storage-logging"
		});

		await service.start();
		await testScheduler.runPending();

		expect(log).toHaveBeenCalledWith({
			level: "error",
			source: "MailStorageService",
			ts: expect.any(Number),
			message: "retentionCleanupFailed",
			error: expect.objectContaining({ message: "cleanup failed" })
		});
	});
});

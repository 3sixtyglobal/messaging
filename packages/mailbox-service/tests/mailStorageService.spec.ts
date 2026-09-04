// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@twin.org/background-task-models";
import { ComponentFactory } from "@twin.org/core";
import { ComparisonOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type { IEmail } from "@twin.org/mailbox-models";
import { nameof } from "@twin.org/nameof";
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
		expect(querySpy).toHaveBeenNthCalledWith(
			1,
			{
				conditions: [
					{
						property: "receivedAt",
						comparison: ComparisonOperator.LessThan,
						value: "2026-01-02T00:00:00.000Z"
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

	test("stop removes the configured retention task", async () => {
		service = new MailStorageService({
			storedEmailEntityStorageType: "stored-email",
			config: { retentionMinutes: 30 }
		});

		await service.stop();

		expect(testScheduler.removeTask).toHaveBeenCalledWith("mail-storage-retention");
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

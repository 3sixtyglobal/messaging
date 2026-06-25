// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { TemplateEntry } from "../src/entities/templateEntry.js";
import { MessagingAdminService } from "../src/messagingAdminService.js";
import { initSchema } from "../src/schema.js";

let templateStorageMemory: MemoryEntityStorageConnector<TemplateEntry>;

describe("MessagingAdminService", () => {
	beforeEach(() => {
		initSchema();

		templateStorageMemory = new MemoryEntityStorageConnector<TemplateEntry>({
			entitySchema: nameof<TemplateEntry>(),
			config: { storageKey: "template-entry" }
		});
		EntityStorageConnectorFactory.register("template-entry", () => templateStorageMemory);
	});

	afterEach(async () => {
		await templateStorageMemory.teardown();
	});

	test("can construct", async () => {
		const service = new MessagingAdminService();
		expect(service).toBeDefined();
	});

	test("throws error when creating or updating template with invalid templateId", async () => {
		const service = new MessagingAdminService();
		await expect(
			service.setTemplate(undefined as unknown as string, "en", "Test Title", "Test Content")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "templateId",
				value: "undefined"
			}
		});
	});

	test("throws error when creating or updating template with invalid locale", async () => {
		const service = new MessagingAdminService();
		await expect(
			service.setTemplate(
				"templateId",
				undefined as unknown as string,
				"Test Title",
				"Test Content"
			)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "locale",
				value: "undefined"
			}
		});
	});

	test("throws error when creating or updating template with invalid title", async () => {
		const service = new MessagingAdminService();
		await expect(
			service.setTemplate("templateId", "en", undefined as unknown as string, "Test Content")
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "title",
				value: "undefined"
			}
		});
	});

	test("throws error when creating or updating template with invalid content", async () => {
		const service = new MessagingAdminService();
		await expect(
			service.setTemplate("templateId", "en", "Test Title", undefined as unknown as string)
		).rejects.toMatchObject({
			name: "GuardError",
			properties: {
				property: "content",
				value: "undefined"
			}
		});
	});

	test("creates or updates template successfully with valid inputs", async () => {
		const service = new MessagingAdminService();
		await service.setTemplate("templateId", "en", "Test Title", "Test Content");
		expect(await templateStorageMemory.getStore()).toEqual([
			{
				content: "Test Content",
				dateCreated: expect.any(String),
				id: "templateId:en",
				title: "Test Title"
			}
		]);
	});
});

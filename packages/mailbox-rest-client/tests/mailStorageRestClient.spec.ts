// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError, NotSupportedError } from "@twin.org/core";
import type { IStoredEmail } from "@twin.org/mailbox-models";
import { HttpMethod } from "@twin.org/web";
import { MailStorageRestClient } from "../src/mailStorageRestClient.js";
import {
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";
const PREFIX = "mailbox/mail";

const TEST_STORED_EMAIL: IStoredEmail = {
	id: "mail-1",
	mailboxId: "box-1",
	receivedAt: "2026-01-01T00:00:00.000Z",
	subject: "Test Email"
};

const fetchMock = vi.fn();

describe("MailStorageRestClient", () => {
	let client: MailStorageRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new MailStorageRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("className returns MailStorageRestClient", () => {
		expect(client.className()).toBe("MailStorageRestClient");
	});

	describe("store", () => {
		test("throws NotSupportedError when calling store over REST", async () => {
			await expect(client.store("box-1", {})).rejects.toMatchObject({
				name: NotSupportedError.CLASS_NAME
			});
		});
	});

	describe("get", () => {
		test("throws when id is empty", async () => {
			await expect(client.get("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /mailbox/mail/:id", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STORED_EMAIL));

			await client.get("mail-1");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/mail-1`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns stored email from response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_STORED_EMAIL));

			const result = await client.get("mail-1");

			expect(result).toEqual(TEST_STORED_EMAIL);
		});
	});

	describe("remove", () => {
		test("throws when id is empty", async () => {
			await expect(client.remove("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /mailbox/mail/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.remove("mail-1");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/mail-1`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});
	});

	describe("query", () => {
		test("throws when sinceEpoch is empty", async () => {
			await expect(client.query("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /mailbox/mail with query params", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ emails: [], cursor: "next" }));

			await client.query("2026-01-01T00:00:00.000Z", "box-1", "cursor1", 5);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toContain(`${ENDPOINT}/${PREFIX}?`);
			expect(url).toContain("since=2026-01-01T00%3A00%3A00.000Z");
			expect(url).toContain("mailboxId=box-1");
			expect(url).toContain("cursor=cursor1");
			expect(url).toContain("limit=5");
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns emails and cursor from response body", async () => {
			const expected = { emails: [TEST_STORED_EMAIL], cursor: "next" };
			fetchMock.mockResolvedValueOnce(jsonResponse(expected));

			const result = await client.query("2026-01-01T00:00:00.000Z");

			expect(result).toEqual(expected);
		});
	});
});

// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@twin.org/core";
import type { IMailbox, IMailboxConfigField } from "@twin.org/mailbox-models";
import { HttpMethod } from "@twin.org/web";
import { MailboxRestClient } from "../src/mailboxRestClient.js";
import {
	createdResponse,
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";
const PREFIX = "mailbox";

const TEST_MAILBOX: IMailbox = {
	id: "01932e8a-1234-7000-abcd-0123456789ab",
	name: "Test Mailbox",
	connectorType: "pop3",
	enabled: true,
	config: undefined
};

const fetchMock = vi.fn();

describe("MailboxRestClient", () => {
	let client: MailboxRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new MailboxRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("className returns MailboxRestClient", () => {
		expect(client.className()).toBe("MailboxRestClient");
	});

	describe("addMailbox", () => {
		test("throws when mailbox is undefined", async () => {
			await expect(
				client.addMailbox(
					undefined as unknown as Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">
				)
			).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.objectUndefined"
			});
		});

		test("throws when mailbox.name is empty", async () => {
			await expect(
				client.addMailbox({ name: "", connectorType: "pop3", enabled: true, config: undefined })
			).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when mailbox.connectorType is empty", async () => {
			await expect(
				client.addMailbox({ name: "Inbox", connectorType: "", enabled: true, config: undefined })
			).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /mailbox", async () => {
			fetchMock.mockResolvedValueOnce(
				createdResponse("mailbox/01932e8a-1234-7000-abcd-0123456789ab")
			);

			await client.addMailbox({
				name: "Inbox",
				connectorType: "pop3",
				enabled: true,
				config: undefined
			});

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("returns extracted ID from location header", async () => {
			fetchMock.mockResolvedValueOnce(
				createdResponse("mailbox/01932e8a-1234-7000-abcd-0123456789ab")
			);

			const id = await client.addMailbox({
				name: "Inbox",
				connectorType: "pop3",
				enabled: true,
				config: undefined
			});

			expect(id).toBe("01932e8a-1234-7000-abcd-0123456789ab");
		});
	});

	describe("getMailbox", () => {
		test("throws when id is empty", async () => {
			await expect(client.getMailbox("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /mailbox/:id", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_MAILBOX));

			await client.getMailbox("01932e8a-1234-7000-abcd-0123456789ab");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/01932e8a-1234-7000-abcd-0123456789ab`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns mailbox from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_MAILBOX));

			const result = await client.getMailbox("01932e8a-1234-7000-abcd-0123456789ab");

			expect(result).toEqual(TEST_MAILBOX);
		});
	});

	describe("updateMailbox", () => {
		test("throws when mailbox is undefined", async () => {
			await expect(client.updateMailbox(undefined as unknown as IMailbox)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.objectUndefined"
			});
		});

		test("throws when mailbox.id is empty", async () => {
			await expect(
				client.updateMailbox({
					id: "",
					name: "Inbox",
					connectorType: "pop3",
					enabled: true,
					config: undefined
				})
			).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /mailbox/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updateMailbox(TEST_MAILBOX);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/01932e8a-1234-7000-abcd-0123456789ab`);
			expect(options.method).toBe(HttpMethod.PUT);
		});
	});

	describe("removeMailbox", () => {
		test("throws when id is empty", async () => {
			await expect(client.removeMailbox("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /mailbox/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.removeMailbox("01932e8a-1234-7000-abcd-0123456789ab");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/01932e8a-1234-7000-abcd-0123456789ab`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});
	});

	describe("listMailboxes", () => {
		test("sends GET to /mailbox with query params", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ mailboxes: [], cursor: "next" }));

			await client.listMailboxes("cursor1", 10);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toContain(`${ENDPOINT}/${PREFIX}?`);
			expect(url).toContain("cursor=cursor1");
			expect(url).toContain("limit=10");
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns mailboxes and cursor from response body", async () => {
			const expected = { mailboxes: [TEST_MAILBOX], cursor: "next" };
			fetchMock.mockResolvedValueOnce(jsonResponse(expected));

			const result = await client.listMailboxes("cursor1", 10);

			expect(result).toEqual(expected);
		});
	});

	describe("getSchema", () => {
		test("throws when connectorType is empty", async () => {
			await expect(client.getSchema("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /mailbox/connectors/:connectorType/schema", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse([]));

			await client.getSchema("pop3");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/connectors/pop3/schema`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns schema fields from the response body", async () => {
			const expected: IMailboxConfigField[] = [
				{ labelKey: "host", propertyKey: "host", type: "string" },
				{ labelKey: "password", propertyKey: "password", type: "string", isSecure: true }
			];
			fetchMock.mockResolvedValueOnce(jsonResponse(expected));

			const result = await client.getSchema("pop3");

			expect(result).toEqual(expected);
		});
	});
});

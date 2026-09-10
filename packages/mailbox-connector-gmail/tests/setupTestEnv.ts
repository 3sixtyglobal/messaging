// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Coerce, Is } from "@twin.org/core";
import * as dotenv from "dotenv";
import type { IGmailEmailConnectorConfig } from "../src/models/IGmailEmailConnectorConfig.js";

dotenv.config({
	path: [path.join(__dirname, ".env.dev"), path.join(__dirname, ".env")],
	quiet: true
});

console.debug("Setting up test environment from .env and .env.dev files");

// Gmail has no local emulator equivalent to GreenMail, so the unit tests mock the Gmail API
// and run against these placeholder credentials. The refresh token is issued by the consent
// flow rather than configured, so it reaches the connector in its state instead.
export const TEST_GMAIL_CONFIG: IGmailEmailConnectorConfig = {
	emailAddress: "test@example.com",
	clientId: "test-client-id",
	clientSecret: "test-client-secret"
};

// Populate these in tests/.env.dev to exercise the connector against a real Gmail or Google
// Workspace mailbox. Only the OAuth client and the mailbox address are needed, the live suite
// drives the consent flow to obtain the refresh token.
export const TEST_GMAIL_LIVE_CONFIG: IGmailEmailConnectorConfig | undefined =
	Is.stringValue(process.env.TEST_GMAIL_EMAIL_ADDRESS) &&
	Is.stringValue(process.env.TEST_GMAIL_CLIENT_ID) &&
	Is.stringValue(process.env.TEST_GMAIL_CLIENT_SECRET)
		? {
				emailAddress: process.env.TEST_GMAIL_EMAIL_ADDRESS,
				clientId: process.env.TEST_GMAIL_CLIENT_ID,
				clientSecret: process.env.TEST_GMAIL_CLIENT_SECRET
			}
		: undefined;

// The live suite is interactive, it opens a browser and waits for consent, so it stays skipped
// until this is set even when the credentials are present. Set TEST_GMAIL_LIVE=true in
// tests/.env.dev to run it, and remove it again to keep npm run dist unattended.
export const TEST_GMAIL_LIVE_ENABLED: boolean =
	Coerce.boolean(process.env.TEST_GMAIL_LIVE) ?? false;

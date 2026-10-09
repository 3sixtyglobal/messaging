// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Coerce, Is } from "@3sixty/core";
import * as dotenv from "dotenv";
import type { IOutlookEmailConnectorConfig } from "../src/models/IOutlookEmailConnectorConfig.js";

dotenv.config({
	path: [path.join(__dirname, ".env.dev"), path.join(__dirname, ".env")],
	quiet: true
});

console.debug("Setting up test environment from .env and .env.dev files");

// Microsoft Graph has no local emulator equivalent to GreenMail, so the unit tests mock the
// Graph API and run against these placeholder credentials. The refresh token is issued by the
// consent flow rather than configured, so it reaches the connector in its state instead.
export const TEST_OUTLOOK_CONFIG: IOutlookEmailConnectorConfig = {
	emailAddress: "ingest@example.com",
	tenantId: "test-tenant-id",
	clientId: "test-client-id",
	clientSecret: "test-client-secret"
};

// Populate these in tests/.env.dev to exercise the connector against a real Microsoft 365
// mailbox. Only the app registration and the mailbox address are needed, the live suite drives
// the consent flow to obtain the refresh token.
export const TEST_OUTLOOK_LIVE_CONFIG: IOutlookEmailConnectorConfig | undefined =
	Is.stringValue(process.env.TEST_OUTLOOK_EMAIL_ADDRESS) &&
	Is.stringValue(process.env.TEST_OUTLOOK_TENANT_ID) &&
	Is.stringValue(process.env.TEST_OUTLOOK_CLIENT_ID) &&
	Is.stringValue(process.env.TEST_OUTLOOK_CLIENT_SECRET)
		? {
				emailAddress: process.env.TEST_OUTLOOK_EMAIL_ADDRESS,
				tenantId: process.env.TEST_OUTLOOK_TENANT_ID,
				clientId: process.env.TEST_OUTLOOK_CLIENT_ID,
				clientSecret: process.env.TEST_OUTLOOK_CLIENT_SECRET
			}
		: undefined;

// The live suite is interactive, it opens a browser and waits for consent, so it stays skipped
// until this is set even when the credentials are present. Set TEST_OUTLOOK_LIVE=true in
// tests/.env.dev to run it, and remove it again to keep npm run dist unattended.
export const TEST_OUTLOOK_LIVE_ENABLED: boolean =
	Coerce.boolean(process.env.TEST_OUTLOOK_LIVE) ?? false;

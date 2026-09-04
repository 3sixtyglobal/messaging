// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Guards } from "@twin.org/core";
import * as dotenv from "dotenv";
import type { IImapEmailConnectorConfig } from "../src/models/IImapEmailConnectorConfig.js";

dotenv.config({
	path: [path.join(__dirname, ".env.dev"), path.join(__dirname, ".env")],
	quiet: true
});

console.debug("Setting up test environment from .env and .env.dev files");

Guards.stringValue("TestEnv", "TEST_IMAP_HOST", process.env.TEST_IMAP_HOST);
Guards.stringValue("TestEnv", "TEST_IMAP_SMTP_PORT", process.env.TEST_IMAP_SMTP_PORT);
Guards.stringValue("TestEnv", "TEST_IMAP_HTTP_PORT", process.env.TEST_IMAP_HTTP_PORT);
Guards.stringValue("TestEnv", "TEST_IMAP_PORT", process.env.TEST_IMAP_PORT);
Guards.stringValue("TestEnv", "TEST_IMAP_USERNAME", process.env.TEST_IMAP_USERNAME);
Guards.stringValue("TestEnv", "TEST_IMAP_PASSWORD", process.env.TEST_IMAP_PASSWORD);

export const TEST_IMAP_HOST: string = process.env.TEST_IMAP_HOST;
export const TEST_IMAP_SMTP_PORT: number = Number(process.env.TEST_IMAP_SMTP_PORT);
export const TEST_IMAP_HTTP_PORT: number = Number(process.env.TEST_IMAP_HTTP_PORT);

export const TEST_IMAP_CONFIG: IImapEmailConnectorConfig = {
	host: process.env.TEST_IMAP_HOST,
	port: Number(process.env.TEST_IMAP_PORT),
	secure: false,
	username: process.env.TEST_IMAP_USERNAME,
	password: process.env.TEST_IMAP_PASSWORD,
	folders: ["INBOX"]
};

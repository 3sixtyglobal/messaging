// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Guards } from "@3sixty/core";
import * as dotenv from "dotenv";
import type { IPop3EmailConnectorConfig } from "../src/models/IPop3EmailConnectorConfig.js";

dotenv.config({
	path: [path.join(__dirname, ".env.dev"), path.join(__dirname, ".env")],
	quiet: true
});

console.debug("Setting up test environment from .env and .env.dev files");

Guards.stringValue("TestEnv", "TEST_POP3_HOST", process.env.TEST_POP3_HOST);
Guards.stringValue("TestEnv", "TEST_POP3_SMTP_PORT", process.env.TEST_POP3_SMTP_PORT);
Guards.stringValue("TestEnv", "TEST_POP3_HTTP_PORT", process.env.TEST_POP3_HTTP_PORT);
Guards.stringValue("TestEnv", "TEST_POP3_PORT", process.env.TEST_POP3_PORT);
Guards.stringValue("TestEnv", "TEST_POP3_USERNAME", process.env.TEST_POP3_USERNAME);
Guards.stringValue("TestEnv", "TEST_POP3_PASSWORD", process.env.TEST_POP3_PASSWORD);

export const TEST_POP3_HOST: string = process.env.TEST_POP3_HOST;
export const TEST_POP3_SMTP_PORT: number = Number(process.env.TEST_POP3_SMTP_PORT);
export const TEST_POP3_HTTP_PORT: number = Number(process.env.TEST_POP3_HTTP_PORT);

export const TEST_POP3_CONFIG: IPop3EmailConnectorConfig = {
	host: process.env.TEST_POP3_HOST,
	port: Number(process.env.TEST_POP3_PORT),
	secure: false,
	username: process.env.TEST_POP3_USERNAME,
	password: process.env.TEST_POP3_PASSWORD
};

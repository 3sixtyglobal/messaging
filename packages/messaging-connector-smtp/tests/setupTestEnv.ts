// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Guards } from "@3sixty/core";
import * as dotenv from "dotenv";
import type { ISmtpMessagingEmailConnectorConfig } from "../src/models/ISmtpMessagingEmailConnectorConfig.js";

dotenv.config({
	path: [path.join(__dirname, ".env.dev"), path.join(__dirname, ".env")],
	quiet: true
});

console.debug("Setting up test environment from .env and .env.dev files");

Guards.stringValue("TestEnv", "TEST_SMTP_HOST", process.env.TEST_SMTP_HOST);
Guards.stringValue("TestEnv", "TEST_SMTP_SMTP_PORT", process.env.TEST_SMTP_SMTP_PORT);
Guards.stringValue("TestEnv", "TEST_SMTP_HTTP_PORT", process.env.TEST_SMTP_HTTP_PORT);
Guards.stringValue("TestEnv", "TEST_SMTP_USERNAME", process.env.TEST_SMTP_USERNAME);
Guards.stringValue("TestEnv", "TEST_SMTP_PASSWORD", process.env.TEST_SMTP_PASSWORD);

export const TEST_SMTP_HOST: string = process.env.TEST_SMTP_HOST;
export const TEST_SMTP_HTTP_PORT: number = Number(process.env.TEST_SMTP_HTTP_PORT);
export const TEST_SMTP_USERNAME: string = process.env.TEST_SMTP_USERNAME;
export const TEST_SMTP_PASSWORD: string = process.env.TEST_SMTP_PASSWORD;

export const TEST_SMTP_CONFIG: ISmtpMessagingEmailConnectorConfig = {
	host: process.env.TEST_SMTP_HOST,
	port: Number(process.env.TEST_SMTP_SMTP_PORT),
	secure: false
};

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Guards } from "@twin.org/core";
import * as dotenv from "dotenv";
import type { IAwsEmailConnectorConfig } from "../src/models/IAwsEmailConnectorConfig";
import type { IAwsPushNotificationConnectorConfig } from "../src/models/IAwsPushNotificationConnectorConfig";
import type { IAwsSmsConnectorConfig } from "../src/models/IAwsSmsConnectorConfig";

dotenv.config({
	path: [path.join(__dirname, ".env"), path.join(__dirname, ".env.dev")],
	quiet: true
});

console.debug("Setting up test environment from .env and .env.dev files");

Guards.stringValue("TestEnv", "TEST_AWS_REGION", process.env.TEST_AWS_REGION);
Guards.stringValue("TestEnv", "TEST_AWS_KEY_ID", process.env.TEST_AWS_KEY_ID);
Guards.stringValue("TestEnv", "TEST_AWS_KEY_SECRET", process.env.TEST_AWS_KEY_SECRET);
Guards.stringValue("TestEnv", "TEST_AWS_APP_ID", process.env.TEST_AWS_APP_ID);
Guards.stringValue("TestEnv", "TEST_AWS_APP_TYPE", process.env.TEST_AWS_APP_TYPE);
Guards.stringValue("TestEnv", "TEST_AWS_APP_CREDENTIALS", process.env.TEST_AWS_APP_CREDENTIALS);

export const TEST_AWS_CONFIG: IAwsEmailConnectorConfig | IAwsSmsConnectorConfig = {
	endpoint: process.env.TEST_AWS_ENDPOINT,
	region: process.env.TEST_AWS_REGION,
	accessKeyId: process.env.TEST_AWS_KEY_ID,
	secretAccessKey: process.env.TEST_AWS_KEY_SECRET
};

export const TEST_AWS_CONFIG_PUSH: IAwsPushNotificationConnectorConfig = {
	...TEST_AWS_CONFIG,
	applicationsSettings: [
		{
			applicationId: process.env.TEST_AWS_APP_ID,
			pushNotificationsPlatformType: process.env.TEST_AWS_APP_TYPE,
			pushNotificationsPlatformCredentials: process.env.TEST_AWS_APP_CREDENTIALS
		}
	]
};

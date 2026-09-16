// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EmailConsumerFactory } from "../src/factories/emailConsumerFactory.js";
import { EmailProtocolConnectorConfigSchemaFactory } from "../src/factories/emailProtocolConnectorConfigSchemaFactory.js";
import { EmailProtocolConnectorFactory } from "../src/factories/emailProtocolConnectorFactory.js";
import type { IEmailConsumer } from "../src/models/IEmailConsumer.js";
import type { IEmailProtocolConnector } from "../src/models/IEmailProtocolConnector.js";
import type { IMailboxConfigField } from "../src/models/IMailboxConfigField.js";

describe("EmailProtocolConnectorFactory", () => {
	test("can register an email protocol connector", () => {
		EmailProtocolConnectorFactory.register(
			"test-protocol",
			() => ({}) as unknown as IEmailProtocolConnector
		);
	});
});

describe("EmailProtocolConnectorConfigSchemaFactory", () => {
	test("can register a schema for an email protocol", () => {
		const schema: IMailboxConfigField[] = [];
		EmailProtocolConnectorConfigSchemaFactory.register("test-protocol", () => schema);
	});
});

describe("EmailConsumerFactory", () => {
	test("can register an email consumer", () => {
		EmailConsumerFactory.register("test-consumer", () => ({}) as unknown as IEmailConsumer);
	});
});

// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@twin.org/core";
import type { IEmailConsumer } from "../models/IEmailConsumer.js";

/**
 * Factory for creating email consumer instances.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmailConsumerFactory = Factory.createFactory<IEmailConsumer>("email-consumer");

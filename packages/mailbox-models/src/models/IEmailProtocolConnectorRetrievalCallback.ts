// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";
import type { IEmail } from "./IEmail.js";

/**
 * Callback invoked by a protocol connector to persist a single retrieved message.
 * @param mailboxId The identifier of the mailbox this retrieval belongs to.
 * @param message The message to persist.
 * @param updatedState The connector state to persist on the mailbox entity after this message.
 * @returns True if the message was persisted successfully; false causes the connector to exit the polling loop.
 */
export type IEmailProtocolConnectorRetrievalCallback = (
	mailboxId: string,
	message: IEmail | undefined,
	updatedState: unknown,
	retrievalError?: IError
) => Promise<boolean>;

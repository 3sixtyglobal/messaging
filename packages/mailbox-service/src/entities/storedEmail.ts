// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SortDirection, entity, property } from "@twin.org/entity";
import type { IEmailAddress, IEmailAttachment, IEmailHeader } from "@twin.org/mailbox-models";

/**
 * Entity class representing a received email stored in entity storage.
 */
@entity()
export class StoredEmail {
	/**
	 * The unique storage identifier for this email.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The identifier of the mailbox that received this email.
	 */
	@property({ type: "string", isSecondary: true })
	public mailboxId!: string;

	/**
	 * The ISO 8601 timestamp when this email was stored.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public receivedAt!: string;

	/**
	 * The parsed message headers.
	 */
	@property({ type: "array", optional: true })
	public headers?: IEmailHeader[];

	/**
	 * The unique message identifier from the email headers.
	 */
	@property({ type: "string", optional: true })
	public messageId?: string;

	/**
	 * The sender address (From header).
	 */
	@property({ type: "object", optional: true })
	public from?: IEmailAddress;

	/**
	 * The Sender header address, when different from From.
	 */
	@property({ type: "object", optional: true })
	public sender?: IEmailAddress;

	/**
	 * The primary recipient addresses.
	 */
	@property({ type: "array", optional: true })
	public to?: IEmailAddress[];

	/**
	 * The carbon-copy recipient addresses.
	 */
	@property({ type: "array", optional: true })
	public cc?: IEmailAddress[];

	/**
	 * The blind carbon-copy recipient addresses.
	 */
	@property({ type: "array", optional: true })
	public bcc?: IEmailAddress[];

	/**
	 * The reply-to addresses.
	 */
	@property({ type: "array", optional: true })
	public replyTo?: IEmailAddress[];

	/**
	 * The final delivery address from the Delivered-To header.
	 */
	@property({ type: "string", optional: true })
	public deliveredTo?: string;

	/**
	 * The Return-Path address.
	 */
	@property({ type: "string", optional: true })
	public returnPath?: string;

	/**
	 * The Message-ID this message is a reply to.
	 */
	@property({ type: "string", optional: true })
	public inReplyTo?: string;

	/**
	 * The space-separated list of related message identifiers.
	 */
	@property({ type: "string", optional: true })
	public references?: string;

	/**
	 * The message subject line.
	 */
	@property({ type: "string", optional: true })
	public subject?: string;

	/**
	 * The message date as an ISO 8601 string.
	 */
	@property({ type: "string", optional: true })
	public date?: string;

	/**
	 * The plain-text body of the message.
	 */
	@property({ type: "string", optional: true })
	public textContent?: string;

	/**
	 * The HTML body of the message.
	 */
	@property({ type: "string", optional: true })
	public htmlContent?: string;

	/**
	 * The attachments included with the message.
	 */
	@property({ type: "array", optional: true })
	public attachments?: IEmailAttachment[];

	/**
	 * Protocol-level flags on the message.
	 */
	@property({ type: "array", optional: true })
	public flags?: string[];
}

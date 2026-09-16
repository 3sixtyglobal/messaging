// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEmailAddress } from "./IEmailAddress.js";
import type { IEmailAttachment } from "./IEmailAttachment.js";
import type { IEmailHeader } from "./IEmailHeader.js";

/**
 * Interface describing a normalised email message at the connector boundary.
 */
export interface IEmail {
	/**
	 * The parsed message headers.
	 */
	headers?: IEmailHeader[];

	/**
	 * The unique message identifier.
	 */
	messageId?: string;

	/**
	 * The sender address (From header).
	 */
	from?: IEmailAddress;

	/**
	 * The Sender header address, when different from From.
	 */
	sender?: IEmailAddress;

	/**
	 * The primary recipient addresses.
	 */
	to?: IEmailAddress[];

	/**
	 * The carbon-copy recipient addresses.
	 */
	cc?: IEmailAddress[];

	/**
	 * The blind carbon-copy recipient addresses.
	 */
	bcc?: IEmailAddress[];

	/**
	 * The reply-to addresses.
	 */
	replyTo?: IEmailAddress[];

	/**
	 * The final delivery address from the Delivered-To header.
	 */
	deliveredTo?: string;

	/**
	 * The Return-Path address.
	 */
	returnPath?: string;

	/**
	 * The Message-ID this message is a reply to.
	 */
	inReplyTo?: string;

	/**
	 * The space-separated list of related message identifiers.
	 */
	references?: string;

	/**
	 * The message subject.
	 */
	subject?: string;

	/**
	 * The message date as an ISO 8601 string.
	 */
	date?: string;

	/**
	 * The plain-text body of the message.
	 */
	textContent?: string;

	/**
	 * The HTML body of the message.
	 */
	htmlContent?: string;

	/**
	 * The attachments included with the message.
	 */
	attachments?: IEmailAttachment[];

	/**
	 * Protocol-level flags on the message, for example \\Seen.
	 */
	flags?: string[];
}

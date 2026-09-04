// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing an email attachment.
 */
export interface IEmailAttachment {
	/**
	 * The filename of the attachment.
	 */
	filename?: string;

	/**
	 * The MIME content type of the attachment.
	 */
	contentType: string;

	/**
	 * The attachment data encoded as a base64 string.
	 */
	data: string;
}

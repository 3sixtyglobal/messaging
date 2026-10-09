// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, Is } from "@3sixty/core";
import PostalMime from "postal-mime";
import type { IEmail } from "../models/IEmail.js";
import type { IEmailAddress } from "../models/IEmailAddress.js";

/**
 * Shared utilities for parsing raw RFC822 email messages and mapping postal-mime address objects.
 */
export class MailHelper {
	/**
	 * Map a postal-mime address object to an IEmailAddress, or return undefined when no address is present.
	 * @param address The postal-mime address to map.
	 * @param address.name The display name of the email address.
	 * @param address.address The email address string.
	 * @returns The mapped address, or undefined.
	 */
	public static mapAddress(
		address?: { name: string; address?: string } | undefined
	): IEmailAddress | undefined {
		if (Is.stringValue(address?.address)) {
			return { name: address?.name, address: address?.address };
		}
		return undefined;
	}

	/**
	 * Map an array of postal-mime address objects to IEmailAddress[], or return undefined when the input is empty.
	 * @param addresses The postal-mime addresses to map.
	 * @returns The mapped addresses, or undefined.
	 */
	public static mapAddresses(
		addresses: { name: string; address?: string }[] | undefined
	): IEmailAddress[] | undefined {
		const mapped = (addresses ?? [])
			.filter(addr => Is.stringValue(addr.address))
			.map(addr => ({ name: addr.name, address: addr.address as string }));
		return mapped.length > 0 ? mapped : undefined;
	}

	/**
	 * Parse a raw RFC822 email string into an IEmail object using postal-mime.
	 * @param raw The raw email string.
	 * @param flags Optional IMAP flags associated with the message.
	 * @returns The parsed email, or undefined if the input is empty.
	 */
	public static async parseEmail(raw: string, flags?: string[]): Promise<IEmail | undefined> {
		if (!Is.stringValue(raw)) {
			return undefined;
		}

		const parsed = await PostalMime.parse(raw);

		const attachments =
			parsed.attachments.length > 0
				? parsed.attachments.map(a => ({
						filename: a.filename ?? undefined,
						contentType: a.mimeType,
						data: MailHelper.attachmentToBase64(a.content)
					}))
				: undefined;

		return {
			headers: parsed.headers.map(h => ({
				key: h.key,
				originalKey: h.originalKey,
				value: h.value
			})),
			messageId: parsed.messageId,
			from: MailHelper.mapAddress(parsed.from),
			sender: MailHelper.mapAddress(parsed.sender),
			to: MailHelper.mapAddresses(parsed.to),
			cc: MailHelper.mapAddresses(parsed.cc),
			bcc: MailHelper.mapAddresses(parsed.bcc),
			replyTo: MailHelper.mapAddresses(parsed.replyTo),
			deliveredTo: parsed.deliveredTo,
			returnPath: parsed.returnPath,
			inReplyTo: parsed.inReplyTo,
			references: parsed.references,
			subject: parsed.subject,
			date: parsed.date,
			textContent: parsed.text,
			htmlContent: parsed.html,
			attachments,
			flags
		};
	}

	/**
	 * Convert postal-mime attachment content to a base64 string.
	 * Handles string (text), Uint8Array, and ArrayBuffer inputs.
	 * @param content The attachment content.
	 * @returns The base64-encoded content.
	 */
	public static attachmentToBase64(content: string | ArrayBuffer | Uint8Array): string {
		if (Is.stringValue(content)) {
			return Converter.bytesToBase64(Converter.utf8ToBytes(content));
		}
		if (Is.uint8Array(content)) {
			return Converter.bytesToBase64(content);
		}
		return Converter.bytesToBase64(new Uint8Array(content));
	}
}

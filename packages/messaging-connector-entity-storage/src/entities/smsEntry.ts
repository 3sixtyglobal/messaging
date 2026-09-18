// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class defining an SMS entry.
 */
@entity()
export class SmsEntry {
	/**
	 * The id.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The phone number to deliver the message.
	 */
	@property({ type: "string", maxLength: 32 })
	public phoneNumber!: string;

	/**
	 * The timestamp of the sms entry.
	 */
	@property({ type: "integer", format: "uint64", sortDirection: SortDirection.Descending })
	public ts!: number;

	/**
	 * The message.
	 */
	@property({ type: "string", maxLength: 1024 })
	public message!: string;

	/**
	 * The status.
	 */
	@property({ type: "string", maxLength: 128 })
	public status!: string;

	/**
	 * The error.
	 */
	@property({ type: "object", optional: true })
	public error?: IError;
}

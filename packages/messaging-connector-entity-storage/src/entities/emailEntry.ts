// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class defining an email entry.
 */
@entity()
export class EmailEntry {
	/**
	 * The id.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The sender email address.
	 */
	@property({ type: "string", format: "email" })
	public sender!: string;

	/**
	 * The recipient email addresses.
	 */
	@property({ type: "array", itemType: "string" })
	public recipients!: string[];

	/**
	 * The timestamp of the email entry.
	 */
	@property({ type: "integer", format: "uint64", sortDirection: SortDirection.Descending })
	public ts!: number;

	/**
	 * The message.
	 */
	@property({ type: "string" })
	public message!: string;

	/**
	 * The subject.
	 */
	@property({ type: "string", maxLength: 1024 })
	public subject!: string;

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

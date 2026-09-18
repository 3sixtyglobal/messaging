// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class defining a push notification message entry.
 */
@entity()
export class PushNotificationMessageEntry {
	/**
	 * The id.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The device address.
	 */
	@property({ type: "string", maxLength: 255 })
	public deviceAddress!: string;

	/**
	 * The title.
	 */
	@property({ type: "string", maxLength: 256 })
	public title!: string;

	/**
	 * The message.
	 */
	@property({ type: "string" })
	public message!: string;

	/**
	 * The timestamp of the push notification entry.
	 */
	@property({ type: "integer", format: "uint64", sortDirection: SortDirection.Descending })
	public ts!: number;

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

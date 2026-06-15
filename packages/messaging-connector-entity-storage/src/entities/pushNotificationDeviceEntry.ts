// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@twin.org/core";
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class defining a push notification device entry.
 */
@entity()
export class PushNotificationDeviceEntry {
	/**
	 * The id.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The applicationId.
	 */
	@property({ type: "string" })
	public applicationId!: string;

	/**
	 * The device token.
	 */
	@property({ type: "string" })
	public deviceToken!: string;

	/**
	 * The timestamp of the push notification device entry.
	 */
	@property({ type: "integer", format: "uint64", sortDirection: SortDirection.Descending })
	public ts!: number;

	/**
	 * The status.
	 */
	@property({ type: "string" })
	public status!: string;

	/**
	 * The error.
	 */
	@property({ type: "object", optional: true })
	public error?: IError;
}

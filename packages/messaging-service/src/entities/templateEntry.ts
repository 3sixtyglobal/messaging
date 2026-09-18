// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class defining a message template entry.
 */
@entity()
export class TemplateEntry {
	/**
	 * The id.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The title.
	 */
	@property({ type: "string", maxLength: 256 })
	public title!: string;

	/**
	 * The content.
	 */
	@property({ type: "string" })
	public content!: string;

	/**
	 * The timestamp of the template entry.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateCreated!: string;
}

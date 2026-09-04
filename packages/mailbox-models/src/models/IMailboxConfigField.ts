// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { EntitySchemaPropertyType } from "@twin.org/entity";

/**
 * Interface describing a single configuration field for a protocol connector.
 */
export interface IMailboxConfigField {
	/**
	 * The i18n key for the field label shown in the UI.
	 */
	labelKey: string;

	/**
	 * The key of the property within the connector config object.
	 */
	propertyKey: string;

	/**
	 * The entity schema property type for this field.
	 */
	type: EntitySchemaPropertyType;

	/**
	 * Whether this field holds a sensitive value that should be stored in the vault.
	 */
	isSecure?: boolean;

	/**
	 * The element type when `type` is `Array`.
	 */
	itemType?: EntitySchemaPropertyType;

	/**
	 * An optional default value for the field.
	 */
	defaultValue?: unknown;
}

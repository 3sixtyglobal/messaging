// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the messaging service.
 */
export interface IMessagingServiceConfig {
	/**
	 * Replace linked http and https style sheets in e-mail templates with inline style elements.
	 * @default true
	 */
	inlineStyleSheets?: boolean;

	/**
	 * How long fetched style sheets are cached in milliseconds, 0 disables the cache.
	 * @default 3600000
	 */
	styleSheetCacheTtlMs?: number;
}

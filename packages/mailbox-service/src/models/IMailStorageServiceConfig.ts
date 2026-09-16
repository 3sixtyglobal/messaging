// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the mail storage service.
 */
export interface IMailStorageServiceConfig {
	/**
	 * The number of minutes to retain stored emails before pruning.
	 * @default 1440 (1 day)
	 */
	retentionMinutes?: number;
}

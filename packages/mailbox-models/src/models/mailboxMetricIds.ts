// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Metric IDs for the mailbox service.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MailboxMetricIds = {
	/**
	 * Number of emails received across all mailboxes.
	 */
	EmailsReceived: "mailbox_emails_received"
} as const;

/**
 * Union type of all mailbox service metric ID string values.
 */
export type MailboxMetricIds = (typeof MailboxMetricIds)[keyof typeof MailboxMetricIds];

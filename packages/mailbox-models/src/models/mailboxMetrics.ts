// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { type ITelemetryMetric, MetricType } from "@3sixty/telemetry-models";
import { MailboxMetricIds } from "./mailboxMetricIds.js";

/**
 * Metrics registered by the mailbox service.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const MailboxMetrics: ITelemetryMetric[] = [
	{
		id: MailboxMetricIds.EmailsReceived,
		label: "Emails received",
		type: MetricType.Counter
	}
];

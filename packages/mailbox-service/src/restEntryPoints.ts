// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@twin.org/api-models";
import { generateRestRoutesMailbox, tagsMailbox } from "./routes/mailboxRoutes.js";
import {
	generateRestRoutesMailboxStorage,
	tagsMailboxStorage
} from "./routes/mailboxStorageRoutes.js";

/**
 * The REST route entry points for the mailbox service.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "mailbox",
		defaultBaseRoute: "mailbox",
		tags: tagsMailbox,
		generateRoutes: generateRestRoutesMailbox
	},
	{
		name: "mail-storage",
		defaultBaseRoute: "mailbox/mail",
		tags: tagsMailboxStorage,
		generateRoutes: generateRestRoutesMailboxStorage
	}
];

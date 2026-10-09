// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import { ComponentFactory, Is } from "@3sixty/core";
import type { IEmail, IEmailProtocolConnectorOptions } from "@3sixty/mailbox-models";
import { TEST_OUTLOOK_LIVE_CONFIG, TEST_OUTLOOK_LIVE_ENABLED } from "./setupTestEnv.js";
import type { IOutlookEmailConnectorState } from "../src/models/IOutlookEmailConnectorState.js";
import { OutlookEmailConnector } from "../src/outlookEmailConnector.js";

const MAILBOX_ID = "live-mailbox";

// Has to be one of the redirect URIs on the app registration, and matches the path the mailbox
// service mounts its callback route on.
const CALLBACK_URI = "http://localhost:3000/mailbox/authcallback";

// The service places the tenant alongside the mailbox identifier, the live suite has a single
// mailbox so the identifier alone correlates the consent response back to it.
const TEST_OPTIONS: IEmailProtocolConnectorOptions = {
	callbackUri: CALLBACK_URI,
	correlationState: MAILBOX_ID
};

function makeScheduler(): {
	scheduler: ITaskSchedulerComponent;
	runPending: () => Promise<void>;
} {
	let pending: (() => Promise<void>) | undefined;
	const scheduler: ITaskSchedulerComponent = {
		className: () => "TestScheduler",
		addTask: async (taskId: string, times: unknown[], callback: () => Promise<void>) => {
			pending = callback;
		},
		removeTask: async () => {
			pending = undefined;
		},
		tasksInfo: async () => ({ tasks: [] })
	} as unknown as ITaskSchedulerComponent;
	return {
		scheduler,
		runPending: async () => {
			await pending?.();
		}
	};
}

interface ICallbackCapture {
	server: Server;
	waitForCode: Promise<{ code: string; state: string }>;
}

/**
 * Listen on the callback URI for the redirect the consent flow ends with.
 * @returns The server and a promise which resolves with the captured code.
 */
async function captureCallback(): Promise<ICallbackCapture> {
	const callbackUrl = new URL(CALLBACK_URI);
	const port = Number(callbackUrl.port.length > 0 ? callbackUrl.port : 80);

	let resolveCode: (value: { code: string; state: string }) => void;
	let rejectCode: (reason: Error) => void;
	const waitForCode = new Promise<{ code: string; state: string }>((resolve, reject) => {
		resolveCode = resolve;
		rejectCode = reject;
	});

	const server = createServer((request, response) => {
		const requestUrl = new URL(request.url ?? "/", callbackUrl.origin);

		if (requestUrl.pathname !== callbackUrl.pathname) {
			response.writeHead(404).end("Not the callback path");
			return;
		}

		const code = requestUrl.searchParams.get("code");
		const state = requestUrl.searchParams.get("state");
		const error = requestUrl.searchParams.get("error");

		if (Is.stringValue(error)) {
			response.writeHead(400).end(`Consent failed: ${error}`);
			rejectCode(new Error(`Consent failed: ${error}`));
			return;
		}

		if (!Is.stringValue(code) || !Is.stringValue(state)) {
			response.writeHead(400).end("Callback carried no code or state");
			rejectCode(new Error("Callback carried no code or state"));
			return;
		}

		response
			.writeHead(200, { "Content-Type": "text/plain" })
			.end("Consent captured, you can close this tab and return to the test run.");
		resolveCode({ code, state });
	});

	await new Promise<void>(resolve => {
		server.listen(port, () => resolve());
	});

	return { server, waitForCode };
}

function openBrowser(url: string): void {
	// Windows goes through rundll32 rather than "cmd /c start", because cmd treats the ampersands
	// separating the query parameters as command separators and would hand the browser only the
	// part of the consent URL before the first one.
	const openers: { [platform: string]: { command: string; args: string[] } } = {
		win32: { command: "rundll32", args: ["url.dll,FileProtocolHandler", url] },
		darwin: { command: "open", args: [url] }
	};
	const { command, args } = openers[process.platform] ?? { command: "xdg-open", args: [url] };

	const child = spawn(command, args, { detached: true, stdio: "ignore" });
	child.unref();
}

function logSubjects(label: string, emails: IEmail[]): void {
	console.debug("");
	console.debug(`${label}: ${emails.length} message(s)`);
	for (const email of emails) {
		console.debug(`  ${email.subject ?? "(no subject)"}`);
	}
	console.debug("");
}

describe.skipIf(!TEST_OUTLOOK_LIVE_ENABLED || TEST_OUTLOOK_LIVE_CONFIG === undefined)(
	"OutlookEmailConnector live",
	() => {
		beforeEach(() => {
			const { scheduler } = makeScheduler();
			ComponentFactory.register("task-scheduler", () => scheduler);
		});

		test("completes the consent flow and monitors the mailbox", async () => {
			if (TEST_OUTLOOK_LIVE_CONFIG === undefined) {
				return;
			}

			const { scheduler, runPending } = makeScheduler();
			ComponentFactory.register("task-scheduler", () => scheduler);

			// No credentials are configured, so the connector has to ask for consent.
			const connector = new OutlookEmailConnector({ config: TEST_OUTLOOK_LIVE_CONFIG });

			const state: IOutlookEmailConnectorState = {};
			const retrieved: IEmail[] = [];
			let authUrl: string | undefined;
			let requiresAuth = false;
			let issuedState: IOutlookEmailConnectorState | undefined;

			await connector.retrieve(
				MAILBOX_ID,
				state,
				async (mailboxId, updatedState, callbackRequiresAuth, authState) => {
					requiresAuth = callbackRequiresAuth;
					authUrl = authState?.authUrl;
					issuedState = (updatedState as IOutlookEmailConnectorState) ?? issuedState;
				},
				async (mailboxId, message) => {
					if (message) {
						retrieved.push(message);
					}
					return true;
				},
				TEST_OPTIONS
			);

			const capture = await captureCallback();

			try {
				// First poll, the mailbox has no credentials so consent is requested.
				await runPending();

				expect(requiresAuth).toBe(true);
				expect(authUrl).toBeDefined();

				console.debug("");
				console.debug("Consent required, opening the browser. If it does not open, visit:");
				console.debug(authUrl);
				console.debug("");

				openBrowser(authUrl ?? "");

				const callback = await capture.waitForCode;

				// The correlation state has to survive the round trip through the provider.
				expect(callback.state).toBe(TEST_OPTIONS.correlationState);

				await connector.completeAuth(MAILBOX_ID, { code: callback.code }, TEST_OPTIONS);

				// The connector reports the outcome through the auth callback, which lifts the halt
				// and hands the issued credentials over in the state for the owner to vault.
				expect(requiresAuth).toBe(false);
				expect(issuedState?.tokenCache).toBeTypeOf("string");
				expect(issuedState?.accountId).toBeTypeOf("string");

				// Second poll, now authenticated, walks the existing folder contents.
				await runPending();

				expect(requiresAuth).toBe(false);
				logSubjects("Retrieved", retrieved);

				for (const email of retrieved) {
					expect(email.messageId).toBeDefined();
				}

				// Third poll, nothing already delivered may come back a second time.
				const deliveredBefore = [...retrieved];
				await runPending();

				const redelivered = retrieved
					.slice(deliveredBefore.length)
					.filter(email => deliveredBefore.some(seen => seen.messageId === email.messageId));
				logSubjects("Redelivered", redelivered);
				expect(redelivered).toEqual([]);

				// Polling until the walk finishes leaves a delta cursor to resume from, which is
				// what proves the token refresh and the incremental sync both work unattended.
				let cycles = 0;
				while (state.initialSyncComplete !== true && cycles < 20) {
					await runPending();
					cycles++;
				}

				expect(state.initialSyncComplete).toBe(true);
				expect(Object.keys(state.deltaLinks ?? {})).toContain("inbox");
			} finally {
				await connector.retrieveStop();
				await new Promise<void>(resolve => {
					capture.server.close(() => resolve());
				});
			}
			// Signing in, clearing the consent prompt and granting the scope all happen by hand,
			// so this needs longer than the default test timeout allows.
		}, 600000);
	}
);

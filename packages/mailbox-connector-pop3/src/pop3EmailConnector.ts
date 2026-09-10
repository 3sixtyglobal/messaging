// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@twin.org/background-task-models";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	GeneralError,
	Guards,
	Is,
	Mutex
} from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import type {
	IEmailProtocolConnector,
	IEmailProtocolConnectorAuthCallback,
	IEmailProtocolConnectorOptions,
	IEmailProtocolConnectorRetrievalCallback
} from "@twin.org/mailbox-models";
import { MailHelper } from "@twin.org/mailbox-models";
import { nameof } from "@twin.org/nameof";
import Pop3Command from "node-pop3";
import type { IPop3EmailConnectorConfig } from "./models/IPop3EmailConnectorConfig.js";
import type { IPop3EmailConnectorConstructorOptions } from "./models/IPop3EmailConnectorConstructorOptions.js";
import type { IPop3EmailConnectorState } from "./models/IPop3EmailConnectorState.js";
import { initSchema } from "./schema.js";

/**
 * POP3 email protocol connector. Polls for new messages using node-pop3.
 */
export class Pop3EmailConnector implements IEmailProtocolConnector<IPop3EmailConnectorState> {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<Pop3EmailConnector>();

	/**
	 * The protocol namespace identifier.
	 */
	public static readonly NAMESPACE: string = "pop3";

	/**
	 * The logging component.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The task scheduler component used for polling.
	 * @internal
	 */
	private readonly _taskScheduler: ITaskSchedulerComponent;

	/**
	 * The resolved configuration for this connector instance.
	 * @internal
	 */
	private readonly _config: Required<
		Pick<
			IPop3EmailConnectorConfig,
			| "host"
			| "port"
			| "secure"
			| "username"
			| "password"
			| "pollingIntervalMinutes"
			| "retainMessages"
		>
	> &
		Pick<IPop3EmailConnectorConfig, "mutexTimeoutMs">;

	/**
	 * The identifier of the currently active instance being polled.
	 * @internal
	 */
	private _instanceId?: string;

	/**
	 * Set when retrieve has been called and cleared when retrieveStop is called.
	 * @internal
	 */
	private _retrieving: boolean;

	/**
	 * The last successfully persisted connector state, updated after each successful callback.
	 * @internal
	 */
	private _state?: IPop3EmailConnectorState;

	/**
	 * Create a new instance of Pop3EmailConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IPop3EmailConnectorConstructorOptions) {
		Guards.object(Pop3EmailConnector.CLASS_NAME, nameof(options), options);
		Guards.object(Pop3EmailConnector.CLASS_NAME, nameof(options.config), options.config);
		Guards.stringValue(
			Pop3EmailConnector.CLASS_NAME,
			nameof(options.config.host),
			options.config.host
		);
		Guards.stringValue(
			Pop3EmailConnector.CLASS_NAME,
			nameof(options.config.username),
			options.config.username
		);
		Guards.stringValue(
			Pop3EmailConnector.CLASS_NAME,
			nameof(options.config.password),
			options.config.password
		);

		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(options.loggingComponentType);

		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options.taskSchedulerComponentType ?? "task-scheduler"
		);

		const secure = options.config.secure ?? false;
		this._config = {
			host: options.config.host,
			port: options.config.port ?? (secure ? 995 : 110),
			secure,
			username: options.config.username,
			password: options.config.password,
			pollingIntervalMinutes: Math.max(1, options.config.pollingIntervalMinutes ?? 2),
			retainMessages: options.config.retainMessages ?? true,
			mutexTimeoutMs: options.config.mutexTimeoutMs
		};
		this._retrieving = false;

		// A connector registers its own schemas so the owning component can recognise the
		// secure properties of the configuration and state it persists.
		initSchema();
	}

	/**
	 * Get the class name.
	 * @returns The class name.
	 */
	public className(): string {
		return Pop3EmailConnector.CLASS_NAME;
	}

	/**
	 * Start the internal polling loop for the given instance.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The current connector state for the instance.
	 * @param authCallback Callback invoked when authentication fails during a poll cycle.
	 * @param retrievalCallback Callback invoked with retrieved messages after each poll cycle.
	 * @param options Options supplied by the owning component, unused by this protocol which
	 * authenticates with the stored credentials rather than an external flow.
	 * @returns A promise that resolves when the polling loop has been started.
	 */
	public async retrieve(
		instanceId: string,
		state: IPop3EmailConnectorState,
		authCallback: IEmailProtocolConnectorAuthCallback,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback,
		options: IEmailProtocolConnectorOptions
	): Promise<void> {
		await this.retrieveStop();

		this._retrieving = true;
		this._instanceId = instanceId;
		this._state = state;

		await this._taskScheduler.addTask(
			instanceId,
			[{ intervalMinutes: this._config.pollingIntervalMinutes }],
			async () => {
				await this.poll(authCallback, retrievalCallback);
			}
		);
	}

	/**
	 * Stop the polling loop for this connector.
	 * @returns A promise that resolves when the polling loop has been stopped.
	 */
	public async retrieveStop(): Promise<void> {
		if (Is.stringValue(this._instanceId)) {
			this._retrieving = false;
			await this._taskScheduler.removeTask(this._instanceId);
			this._instanceId = undefined;
			this._state = undefined;
		}
	}

	/**
	 * Poll the POP3 server for new messages using UIDL to track seen messages.
	 * @param authCallback Callback invoked when authentication fails.
	 * @param retrievalCallback Callback invoked with retrieved messages.
	 * @internal
	 */
	private async poll(
		authCallback: IEmailProtocolConnectorAuthCallback,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<void> {
		if (Is.empty(this._state) || !Is.stringValue(this._instanceId)) {
			return;
		}

		// Capture the instance id and state for this poll cycle, retrieveStop can clear the
		// instance fields while a poll is in progress and the mutex must still be released
		// under the key it was locked with.
		const instanceId = this._instanceId;
		const state = this._state;

		await Mutex.lock(instanceId, {
			timeoutMs: this._config.mutexTimeoutMs,
			throwOnTimeout: true
		});

		const pop3 = new Pop3Command({
			user: this._config.username,
			password: this._config.password,
			host: this._config.host,
			port: this._config.port,
			tls: this._config.secure,
			parseStreamToString: true
		});

		try {
			const uidlRaw = await pop3.UIDL();
			const uidlEntries = Is.arrayValue(uidlRaw) ? this.parseUidlResponse(uidlRaw) : [];

			const serverUidls = new Set(uidlEntries.map(e => e.uidl));
			const seenUidls = new Set((this._state.seenUidls ?? []).filter(u => serverUidls.has(u)));
			const toFetch = uidlEntries.filter(e => !seenUidls.has(e.uidl));

			for (const entry of toFetch) {
				if (!this._retrieving) {
					break;
				}

				const raw = await pop3.RETR(entry.number);
				if (Is.stringValue(raw)) {
					const email = await MailHelper.parseEmail(raw);
					if (Is.notEmpty(email)) {
						await this._logging?.log({
							level: "info",
							source: Pop3EmailConnector.CLASS_NAME,
							ts: Date.now(),
							message: "emailReceived",
							data: { subject: email.subject }
						});

						seenUidls.add(entry.uidl);
						this._state.seenUidls = [...seenUidls];

						const persisted = await retrievalCallback(this._instanceId, email, this._state);
						if (!persisted) {
							seenUidls.delete(entry.uidl);
							this._state.seenUidls = [...seenUidls];
							break;
						}

						// Delete immediately after a successful persist rather than batching at the
						// end of the loop, otherwise a RETR failure on a later message would leave
						// already persisted messages on the server with their UIDLs marked as seen.
						// The QUIT in the finally block commits the deletions.
						if (!this._config.retainMessages) {
							await pop3.DELE(entry.number);
						}
					}
				}
			}
		} catch (error) {
			const pollError = new GeneralError(
				Pop3EmailConnector.CLASS_NAME,
				"pollFailed",
				undefined,
				BaseError.fromError(error)
			);

			const rawError = Is.object<{ command?: string }>(error) ? error : undefined;
			const isAuthFailure =
				rawError?.command === "PASS ***" || rawError?.command?.startsWith("USER ");
			if (isAuthFailure) {
				await authCallback(instanceId, state, true, undefined, pollError);
			} else {
				await retrievalCallback(instanceId, undefined, state, pollError);
			}
		} finally {
			try {
				await pop3.QUIT();
			} catch {
				// ignore, not much we can do if the connection is already closed
				// but don't want to prevent the mutex from being unlocked in the finally block below
			}
			Mutex.unlock(instanceId);
		}
	}

	/**
	 * Parse a UIDL response into typed pairs.
	 * node-pop3 returns string[][] (pre-split rows) for multi-message responses and
	 * string[] (raw lines) for single-message responses; both are handled here.
	 * @param uidlResponse The UIDL response from node-pop3.
	 * @returns An array of objects with message number and UIDL string.
	 * @internal
	 */
	private parseUidlResponse(
		uidlResponse: string[] | string[][]
	): { number: number; uidl: string }[] {
		const entries: { number: number; uidl: string }[] = [];
		for (const row of uidlResponse) {
			const parts = Is.array(row) ? row : row.split(" ");
			const msgNumber = Coerce.integer(parts[0]);
			if (Is.notEmpty(msgNumber) && Is.stringValue(parts[1])) {
				entries.push({ number: msgNumber, uidl: parts[1] });
			}
		}
		return entries;
	}
}

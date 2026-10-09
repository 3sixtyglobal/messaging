// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import { BaseError, ComponentFactory, GeneralError, Guards, Is, Mutex } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import type {
	IEmailProtocolConnector,
	IEmailProtocolConnectorAuthCallback,
	IEmailProtocolConnectorOptions,
	IEmailProtocolConnectorRetrievalCallback
} from "@3sixty/mailbox-models";
import { MailHelper } from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import { ImapFlow } from "imapflow";
import type { IImapEmailConnectorConfig } from "./models/IImapEmailConnectorConfig.js";
import type { IImapEmailConnectorConstructorOptions } from "./models/IImapEmailConnectorConstructorOptions.js";
import type { IImapEmailConnectorFolderState } from "./models/IImapEmailConnectorFolderState.js";
import type { IImapEmailConnectorState } from "./models/IImapEmailConnectorState.js";
import { initSchema } from "./schema.js";

/**
 * IMAP email protocol connector. Polls configured folders for new messages using imapflow.
 */
export class ImapEmailConnector implements IEmailProtocolConnector<IImapEmailConnectorState> {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<ImapEmailConnector>();

	/**
	 * The protocol namespace identifier.
	 */
	public static readonly NAMESPACE: string = "imap";

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
			IImapEmailConnectorConfig,
			"host" | "port" | "secure" | "username" | "password" | "folders" | "pollingIntervalMinutes"
		>
	> &
		Pick<IImapEmailConnectorConfig, "mutexTimeoutMs">;

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
	private _state?: IImapEmailConnectorState;

	/**
	 * Create a new instance of ImapEmailConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IImapEmailConnectorConstructorOptions) {
		Guards.object(ImapEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.object(ImapEmailConnector.CLASS_NAME, nameof(options.config), options.config);
		Guards.stringValue(
			ImapEmailConnector.CLASS_NAME,
			nameof(options.config.host),
			options.config.host
		);
		Guards.stringValue(
			ImapEmailConnector.CLASS_NAME,
			nameof(options.config.username),
			options.config.username
		);
		Guards.stringValue(
			ImapEmailConnector.CLASS_NAME,
			nameof(options.config.password),
			options.config.password
		);

		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(options.loggingComponentType);

		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options.taskSchedulerComponentType ?? "task-scheduler"
		);

		const secure = options.config.secure ?? true;
		this._config = {
			host: options.config.host,
			port: options.config.port ?? (secure ? 993 : 143),
			secure,
			username: options.config.username,
			password: options.config.password,
			folders: options.config.folders ?? ["INBOX"],
			pollingIntervalMinutes: Math.max(1, options.config.pollingIntervalMinutes ?? 2),
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
		return ImapEmailConnector.CLASS_NAME;
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
		state: IImapEmailConnectorState,
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
	 * Poll each configured folder for new messages.
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

		const client = new ImapFlow({
			host: this._config.host,
			port: this._config.port,
			secure: this._config.secure,
			auth: { user: this._config.username, pass: this._config.password },
			logger: false
		});

		try {
			await client.connect();

			for (const folder of this._config.folders) {
				const continued = await this.pollFolder(client, folder, retrievalCallback);
				if (!continued) {
					break;
				}
			}
		} catch (error) {
			const pollError = new GeneralError(
				ImapEmailConnector.CLASS_NAME,
				"pollFailed",
				undefined,
				BaseError.fromError(error)
			);

			const rawError = Is.object<{ authenticationFailed?: unknown; response?: unknown }>(error)
				? error
				: undefined;
			const isAuthFailure = rawError?.authenticationFailed === true;
			if (isAuthFailure) {
				await authCallback(instanceId, state, true, undefined, pollError);
			} else {
				await retrievalCallback(instanceId, undefined, state, pollError);
			}
		} finally {
			try {
				await client.logout();
				client.close();
			} catch {
				// ignore, not much we can do if the connection is already closed
				// but don't want to prevent the mutex from being unlocked in the finally block below
			}
			Mutex.unlock(instanceId);
		}
	}

	/**
	 * Poll a single folder for messages with UIDs beyond the last seen UID.
	 * Each parsed message is forwarded to the retrieval callback; returning false aborts processing.
	 * @param client The connected ImapFlow client.
	 * @param folder The folder path to poll.
	 * @param retrievalCallback Callback invoked for each parsed email; return false to abort.
	 * @returns True if all messages were processed, false if processing was aborted.
	 * @internal
	 */
	private async pollFolder(
		client: ImapFlow,
		folder: string,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		if (Is.empty(this._state) || !Is.stringValue(this._instanceId)) {
			return true;
		}

		this._state.folders ??= {};
		const folderState: IImapEmailConnectorFolderState = this._state.folders[folder] ?? {};
		this._state.folders[folder] = folderState;

		const lock = await client.getMailboxLock(folder);
		try {
			if (!client.mailbox) {
				return true;
			}

			const uidValidity = client.mailbox.uidValidity.toString();

			if (folderState.uidValidity !== uidValidity) {
				folderState.uidValidity = uidValidity;
				folderState.lastUid = 0;
			}

			const lastUid = folderState.lastUid ?? 0;
			const searchQuery = lastUid > 0 ? { uid: `${lastUid + 1}:*` } : { all: true };
			const uids = await client.search(searchQuery, { uid: true });

			if (uids !== false && Is.arrayValue(uids)) {
				const msgStream = client.fetch(
					uids,
					{ uid: true, source: true, flags: true },
					{ uid: true }
				);
				// Any early exit from this loop (return, break or throw) must terminate the
				// fetch iterator, otherwise imapflow leaves the FETCH command pending and the
				// LOGOUT queued behind it in poll() never resolves, so the mutex is never
				// released. for await calls the iterator's return() on every exit path.
				for await (const msg of msgStream) {
					if (!this._retrieving) {
						return false;
					}
					const currentLastUid = folderState.lastUid ?? 0;
					if (Is.notEmpty(msg.uid) && msg.uid > currentLastUid) {
						if (Is.notEmpty(msg.source)) {
							const email = await MailHelper.parseEmail(
								msg.source.toString(),
								msg.flags ? [...msg.flags] : undefined
							);
							if (Is.notEmpty(email)) {
								await this._logging?.log({
									level: "info",
									source: ImapEmailConnector.CLASS_NAME,
									ts: Date.now(),
									message: "emailReceived",
									data: { subject: email.subject }
								});
								folderState.lastUid = msg.uid;
								const shouldContinue = await retrievalCallback(
									this._instanceId,
									email,
									this._state
								);
								if (!shouldContinue) {
									folderState.lastUid = currentLastUid;
									return false;
								}
							}
						}
					}
				}
			}
		} finally {
			lock.release();
		}
		return true;
	}
}

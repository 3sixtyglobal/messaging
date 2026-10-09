// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	Mutex
} from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import type {
	IEmail,
	IEmailProtocolConnector,
	IEmailProtocolConnectorAuthCallback,
	IEmailProtocolConnectorAuthState,
	IEmailProtocolConnectorOptions,
	IEmailProtocolConnectorRetrievalCallback
} from "@3sixty/mailbox-models";
import { MailHelper } from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import { google, type Auth, type gmail_v1 as GmailApi } from "googleapis";
import type { IGmailEmailConnectorConfig } from "./models/IGmailEmailConnectorConfig.js";
import type { IGmailEmailConnectorConstructorOptions } from "./models/IGmailEmailConnectorConstructorOptions.js";
import type { IGmailEmailConnectorState } from "./models/IGmailEmailConnectorState.js";
import { initSchema } from "./schema.js";

/**
 * Gmail email protocol connector. Monitors a mailbox for new messages using the Gmail API.
 */
export class GmailEmailConnector implements IEmailProtocolConnector<IGmailEmailConnectorState> {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<GmailEmailConnector>();

	/**
	 * The protocol namespace identifier.
	 */
	public static readonly NAMESPACE: string = "gmail";

	/**
	 * The OAuth 2.0 scopes the connector requires on the mailbox.
	 * @internal
	 */
	private static readonly _SCOPES: string[] = ["https://www.googleapis.com/auth/gmail.readonly"];

	/**
	 * The OAuth 2.0 error codes which mean the mailbox cannot authenticate as it is configured.
	 * @internal
	 */
	private static readonly _OAUTH_FAILURE_CODES: string[] = [
		"invalid_grant",
		"invalid_client",
		"unauthorized_client"
	];

	/**
	 * The OAuth 2.0 error code which means the stored refresh token itself is no longer valid.
	 * The other failure codes describe the client rather than the token, so they must not cause
	 * a working token to be discarded.
	 * @internal
	 */
	private static readonly _OAUTH_TOKEN_REJECTED_CODE: string = "invalid_grant";

	/**
	 * The Gmail API failure reasons which report a quota or rate limit rather than a credential
	 * problem. They share the 403 status with the permission failures, so they are named here to
	 * keep a throttled poll from being treated as an authentication failure.
	 * @internal
	 */
	private static readonly _QUOTA_FAILURE_REASONS: string[] = [
		"rateLimitExceeded",
		"userRateLimitExceeded",
		"dailyLimitExceeded",
		"quotaExceeded",
		"backendError"
	];

	/**
	 * The Google credentials property holding the refresh token.
	 * @internal
	 */
	private static readonly _REFRESH_TOKEN_KEY = "refresh_token";

	/**
	 * The Google consent URL property requesting a refresh token.
	 * @internal
	 */
	private static readonly _ACCESS_TYPE_KEY = "access_type";

	/**
	 * The Google consent URL property preselecting the mailbox account.
	 * @internal
	 */
	private static readonly _LOGIN_HINT_KEY = "login_hint";

	/**
	 * The Google property naming where a consent flow returns to.
	 * @internal
	 */
	private static readonly _REDIRECT_URI_KEY = "redirect_uri";

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
			IGmailEmailConnectorConfig,
			| "emailAddress"
			| "labelIds"
			| "maxMessagesPerPoll"
			| "maxDeliveredIdHistory"
			| "pollingIntervalMinutes"
		>
	> &
		Pick<
			IGmailEmailConnectorConfig,
			"clientId" | "clientSecret" | "serviceAccountKey" | "mutexTimeoutMs"
		>;

	/**
	 * The OAuth 2.0 client used to authenticate Gmail API calls.
	 * @internal
	 */
	private readonly _authClient: Auth.OAuth2Client;

	/**
	 * The Gmail API client, created on the first poll and reused afterwards.
	 * @internal
	 */
	private _gmail?: GmailApi.Gmail;

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
	 * The connector state for the instance currently being polled.
	 * @internal
	 */
	private _state?: IGmailEmailConnectorState;

	/**
	 * The fixed URI the consent flow returns to, supplied by the owning component on retrieve.
	 * @internal
	 */
	private _callbackUri?: string;

	/**
	 * The value the consent flow carries so the response correlates back to the mailbox,
	 * supplied by the owning component on retrieve.
	 * @internal
	 */
	private _correlationState?: string;

	/**
	 * The auth callback given by retrieve, used to report the outcome of the consent flow.
	 * @internal
	 */
	private _authCallback?: IEmailProtocolConnectorAuthCallback;

	/**
	 * Create a new instance of GmailEmailConnector.
	 * @param options The options for the connector.
	 * @throws GeneralError if neither a service account key nor an OAuth client is supplied.
	 */
	constructor(options: IGmailEmailConnectorConstructorOptions) {
		Guards.object(GmailEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.object(GmailEmailConnector.CLASS_NAME, nameof(options.config), options.config);
		Guards.stringValue(
			GmailEmailConnector.CLASS_NAME,
			nameof(options.config.emailAddress),
			options.config.emailAddress
		);

		// The refresh token is deliberately not required, a mailbox can be created with just the
		// OAuth client and the connector then drives the consent flow through the auth callback.
		if (
			!Is.stringValue(options.config.serviceAccountKey) &&
			!(Is.stringValue(options.config.clientId) && Is.stringValue(options.config.clientSecret))
		) {
			throw new GeneralError(GmailEmailConnector.CLASS_NAME, "missingOAuthCredentials");
		}

		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(options.loggingComponentType);

		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options.taskSchedulerComponentType ?? "task-scheduler"
		);

		this._config = {
			emailAddress: options.config.emailAddress,
			clientId: options.config.clientId,
			clientSecret: options.config.clientSecret,
			serviceAccountKey: options.config.serviceAccountKey,
			labelIds: Is.arrayValue(options.config.labelIds) ? options.config.labelIds : ["INBOX"],
			maxMessagesPerPoll: Math.max(1, options.config.maxMessagesPerPoll ?? 50),
			maxDeliveredIdHistory: Math.max(1, options.config.maxDeliveredIdHistory ?? 200),
			pollingIntervalMinutes: Math.max(1, options.config.pollingIntervalMinutes ?? 2),
			mutexTimeoutMs: options.config.mutexTimeoutMs
		};
		this._authClient = this.createAuthClient();
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
		return GmailEmailConnector.CLASS_NAME;
	}

	/**
	 * Start the internal polling loop for the given instance.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The current connector state for the instance.
	 * @param authCallback Callback invoked when authentication fails during a poll cycle.
	 * @param retrievalCallback Callback invoked with retrieved messages after each poll cycle.
	 * @param options Options supplied by the owning component, carrying the consent callback URI.
	 * @returns A promise that resolves when the polling loop has been started.
	 */
	public async retrieve(
		instanceId: string,
		state: IGmailEmailConnectorState,
		authCallback: IEmailProtocolConnectorAuthCallback,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback,
		options: IEmailProtocolConnectorOptions
	): Promise<void> {
		Guards.object(GmailEmailConnector.CLASS_NAME, nameof(options), options);

		// The callback URI is only needed to produce a consent URL, so a mailbox which already
		// holds credentials still polls without one.
		await this.retrieveStop();

		this._retrieving = true;
		this._instanceId = instanceId;
		this._state = state;
		this._callbackUri = options.callbackUri;
		this._correlationState = options.correlationState;
		this._authCallback = authCallback;

		// The refresh token is issued by the consent flow rather than configured, so it arrives
		// with the state and has to be handed to the client the constructor built.
		if (Is.stringValue(state?.refreshToken)) {
			this._authClient.setCredentials({
				[GmailEmailConnector._REFRESH_TOKEN_KEY]: state.refreshToken
			});
		}

		await this._taskScheduler.addTask(
			instanceId,
			[{ intervalMinutes: this._config.pollingIntervalMinutes }],
			async () => {
				await this.poll(authCallback, retrievalCallback);
			}
		);
	}

	/**
	 * Start the consent flow for a mailbox which has no refresh token yet.
	 * @param instanceId The identifier of the mailbox instance being authenticated.
	 * @param state The current connector state for the instance.
	 * @param options Options supplied by the owning component, carrying the consent callback URI
	 * and the state which correlates the consent response back to the mailbox.
	 * @returns The auth state carrying the consent URL to open, or undefined when the mailbox can
	 * already authenticate itself from a service account key or a refresh token in its state.
	 */
	public async initiateAuth(
		instanceId: string,
		state: IGmailEmailConnectorState,
		options: IEmailProtocolConnectorOptions
	): Promise<IEmailProtocolConnectorAuthState | undefined> {
		Guards.object(GmailEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.stringValue(
			GmailEmailConnector.CLASS_NAME,
			nameof(options.callbackUri),
			options.callbackUri
		);

		if (!this.needsConsent(state)) {
			return undefined;
		}

		return this.buildAuthState(options.callbackUri, options.correlationState);
	}

	/**
	 * Complete the consent flow with the authorisation code handed to the redirect URI.
	 * The issued credentials are applied to this connector instance so the next poll uses them,
	 * and the refresh token is placed in the state reported through the auth callback given by
	 * retrieve, so the owning component vaults it and lifts the authentication halt.
	 * @param instanceId The identifier of the mailbox instance being authenticated.
	 * @param authPayload The redirect query, carrying the authorisation code as its code property.
	 * @param options Options supplied by the owning component, carrying the consent callback URI.
	 * @returns A promise that resolves when the flow has been completed.
	 * @throws GeneralError if the authorisation code could not be exchanged for tokens.
	 */
	public async completeAuth(
		instanceId: string,
		authPayload: unknown,
		options: IEmailProtocolConnectorOptions
	): Promise<void> {
		Guards.object(GmailEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.stringValue(
			GmailEmailConnector.CLASS_NAME,
			nameof(options.callbackUri),
			options.callbackUri
		);

		const payload = Is.object<{ code?: unknown }>(authPayload) ? authPayload : undefined;
		const code = Coerce.string(payload?.code);
		Guards.stringValue(GmailEmailConnector.CLASS_NAME, nameof(code), code);

		// The authorisation code can only be exchanged once, so the connector refuses before
		// spending it if it has no callback to report the issued token through.
		if (Is.empty(this._authCallback)) {
			throw new GeneralError(GmailEmailConnector.CLASS_NAME, "authFlowNotStarted");
		}

		let refreshToken: string | undefined;
		try {
			// Google requires the same redirect the consent URL was produced with.
			const response = await this._authClient.getToken({
				code,
				[GmailEmailConnector._REDIRECT_URI_KEY]: options.callbackUri
			});
			this._authClient.setCredentials(response.tokens);
			refreshToken = Coerce.string(response.tokens.refresh_token);
		} catch (error) {
			throw new GeneralError(
				GmailEmailConnector.CLASS_NAME,
				"authCodeExchangeFailed",
				undefined,
				BaseError.fromError(error)
			);
		}

		if (!Is.stringValue(refreshToken)) {
			throw new GeneralError(GmailEmailConnector.CLASS_NAME, "noRefreshTokenIssued");
		}

		await this.guardConsentedAccount();

		const state = this.applyRefreshToken(refreshToken);

		// Continue the workflow through the auth callback, which clears the halt and persists the
		// state, where the state schema marks the token as a vaulted field. A restarted connector
		// is then handed the state with the token already in place.
		await this._authCallback(instanceId, state, false);
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
			this._correlationState = undefined;
			this._authCallback = undefined;
		}
	}

	/**
	 * Create the authentication client for the configured credentials.
	 * @returns The authentication client.
	 * @throws GeneralError if the service account key is not valid JSON containing a key pair.
	 * @internal
	 */
	private createAuthClient(): Auth.OAuth2Client {
		if (Is.stringValue(this._config.serviceAccountKey)) {
			const key = Coerce.object<{ client_email?: string; private_key?: string }>(
				this._config.serviceAccountKey
			);

			const clientEmail = key?.client_email;
			const privateKey = key?.private_key;
			if (!Is.stringValue(clientEmail) || !Is.stringValue(privateKey)) {
				throw new GeneralError(GmailEmailConnector.CLASS_NAME, "invalidServiceAccountKey");
			}

			return new google.auth.JWT({
				email: clientEmail,
				key: privateKey,
				scopes: GmailEmailConnector._SCOPES,
				subject: this._config.emailAddress
			});
		}

		// The redirect URI is not set here, it is passed explicitly on the calls which need it so
		// the value always matches the one the owning component supplied.
		// The refresh token is not set here, it lives in the connector state and is applied once
		// retrieve or the consent flow supplies it.
		return new google.auth.OAuth2({
			clientId: this._config.clientId,
			clientSecret: this._config.clientSecret
		});
	}

	/**
	 * Apply an issued refresh token to the state and the authentication client for later polls.
	 * @param refreshToken The refresh token to apply.
	 * @returns The state the token was applied to.
	 * @internal
	 */
	private applyRefreshToken(refreshToken: string): IGmailEmailConnectorState {
		const state = this._state ?? {};
		state.refreshToken = refreshToken;
		this._state = state;

		this._authClient.setCredentials({
			[GmailEmailConnector._REFRESH_TOKEN_KEY]: refreshToken
		});

		return state;
	}

	/**
	 * Verify the account which gave consent is the mailbox the connector is configured for.
	 * @throws GeneralError if the consent was given for a different account.
	 * @internal
	 */
	private async guardConsentedAccount(): Promise<void> {
		// The correlating state travels through the browser, so consent can come back from an
		// account other than the one the mailbox names. Binding the mailbox to it would ingest
		// somebody else's email, so the issued credentials are checked before they are reported.
		const profile = await google
			.gmail({ version: "v1", auth: this._authClient })
			.users.getProfile({ userId: "me" });

		const consentedAddress = Coerce.string(profile.data.emailAddress);

		if (consentedAddress?.toLowerCase() !== this._config.emailAddress.toLowerCase()) {
			throw new GeneralError(GmailEmailConnector.CLASS_NAME, "consentAccountMismatch", {
				emailAddress: this._config.emailAddress
			});
		}
	}

	/**
	 * Whether the connector is still waiting for the consent flow to supply a refresh token.
	 * @param state The connector state holding any token the consent flow has already issued.
	 * @returns True if consent is required before the mailbox can be polled.
	 * @internal
	 */
	private needsConsent(state: IGmailEmailConnectorState | undefined): boolean {
		return !Is.stringValue(this._config.serviceAccountKey) && !Is.stringValue(state?.refreshToken);
	}

	/**
	 * Build the auth state describing how the mailbox can be authenticated.
	 * @param callbackUri The URI the consent flow returns to.
	 * @param correlationState The value the consent flow carries back so the response correlates
	 * to the mailbox it belongs to.
	 * @returns The auth state, or undefined if no consent URL can be produced.
	 * @internal
	 */
	private buildAuthState(
		callbackUri: string | undefined,
		correlationState: string | undefined
	): IEmailProtocolConnectorAuthState | undefined {
		if (Is.stringValue(this._config.serviceAccountKey)) {
			return undefined;
		}

		if (!Is.stringValue(callbackUri) || !Is.stringValue(correlationState)) {
			return undefined;
		}

		return {
			authUrl: this._authClient.generateAuthUrl({
				[GmailEmailConnector._ACCESS_TYPE_KEY]: "offline",
				[GmailEmailConnector._LOGIN_HINT_KEY]: this._config.emailAddress,
				[GmailEmailConnector._REDIRECT_URI_KEY]: callbackUri,
				prompt: "consent",
				scope: GmailEmailConnector._SCOPES,
				// The callback URI is fixed for the deployment, so the owning component supplies
				// the value which correlates the response back to the mailbox and its partition.
				state: correlationState
			})
		};
	}

	/**
	 * Get the Gmail API client, refreshing the access token if it has expired.
	 * @returns The Gmail API client.
	 * @internal
	 */
	private async connect(): Promise<GmailApi.Gmail> {
		// Asking for an access token exchanges the refresh token or the service account key for a
		// new one whenever the cached token has expired, so no manual intervention is needed.
		await this._authClient.getAccessToken();

		this._gmail ??= google.gmail({ version: "v1", auth: this._authClient });
		return this._gmail;
	}

	/**
	 * Determine whether an error reports that the stored credentials were rejected.
	 * @param error The error thrown by the Gmail API or the token endpoint.
	 * @returns True if the error requires the mailbox to be re-authenticated.
	 * @internal
	 */
	private isAuthFailure(error: unknown): boolean {
		const status = this.errorStatus(error);

		if (status === 401) {
			return true;
		}

		// Gmail returns 403 both for a mailbox the credentials may not read and for a poll which
		// exceeded a quota, so a throttled cycle is reported as a retrieval error instead.
		if (status === 403) {
			return !this.isQuotaFailure(error);
		}

		const failureCode = this.oauthFailureCode(error);
		return (
			Is.stringValue(failureCode) && GmailEmailConnector._OAUTH_FAILURE_CODES.includes(failureCode)
		);
	}

	/**
	 * Determine whether an error reports that the stored refresh token is no longer valid.
	 * @param error The error thrown by the Gmail API or the token endpoint.
	 * @returns True if the refresh token has expired or been revoked and has to be replaced.
	 * @internal
	 */
	private isRefreshTokenRejected(error: unknown): boolean {
		return this.oauthFailureCode(error) === GmailEmailConnector._OAUTH_TOKEN_REJECTED_CODE;
	}

	/**
	 * Determine whether an error reports a quota or rate limit rather than a credential problem.
	 * @param error The error thrown by the Gmail API.
	 * @returns True if the request was throttled.
	 * @internal
	 */
	private isQuotaFailure(error: unknown): boolean {
		const details = Is.object<{
			errors?: unknown;
			response?: { data?: unknown };
		}>(error)
			? error
			: undefined;

		const data = Is.object<{ error?: { errors?: unknown } }>(details?.response?.data)
			? details?.response?.data
			: undefined;

		const reasons = [details?.errors, data?.error?.errors]
			.flatMap(entry => (Is.arrayValue<{ reason?: unknown }>(entry) ? entry : []))
			.map(entry => Coerce.string(entry.reason))
			.filter((reason): reason is string => Is.stringValue(reason));

		return reasons.some(reason => GmailEmailConnector._QUOTA_FAILURE_REASONS.includes(reason));
	}

	/**
	 * Determine whether an error reports that the stored history identifier is too old to use.
	 * @param error The error thrown by the Gmail history API.
	 * @returns True if the history identifier has aged out of the mailbox history.
	 * @internal
	 */
	private isHistoryExpired(error: unknown): boolean {
		return this.errorStatus(error) === 404;
	}

	/**
	 * Extract the HTTP status code from a Gmail API error.
	 * @param error The error to inspect.
	 * @returns The status code, or undefined if the error carries none.
	 * @internal
	 */
	private errorStatus(error: unknown): number | undefined {
		const details = Is.object<{
			code?: unknown;
			status?: unknown;
			response?: { status?: unknown };
		}>(error)
			? error
			: undefined;

		return (
			Coerce.number(details?.status) ??
			Coerce.number(details?.code) ??
			Coerce.number(details?.response?.status)
		);
	}

	/**
	 * Extract the OAuth 2.0 failure code from a token endpoint error.
	 * @param error The error to inspect.
	 * @returns The failure code, or undefined if the error carries none.
	 * @internal
	 */
	private oauthFailureCode(error: unknown): string | undefined {
		const details = Is.object<{ message?: unknown; response?: { data?: unknown } }>(error)
			? error
			: undefined;

		const data = Is.object<{ error?: unknown }>(details?.response?.data)
			? details?.response?.data
			: undefined;
		if (Is.stringValue(data?.error)) {
			return data.error;
		}

		// When the refresh request itself is rejected the library surfaces the code in the message.
		const message = Coerce.string(details?.message);
		return GmailEmailConnector._OAUTH_FAILURE_CODES.find(code => message?.includes(code));
	}

	/**
	 * Poll the mailbox for new messages.
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

		try {
			if (this.needsConsent(state)) {
				await this._logging?.log({
					level: "warn",
					source: GmailEmailConnector.CLASS_NAME,
					ts: Date.now(),
					message: "consentRequired",
					data: { mailboxId: instanceId }
				});

				// Hand the consent URL back through the auth callback and wait for the flow to
				// complete, the mailbox has no refresh token to authenticate the Gmail API with.
				await authCallback(
					instanceId,
					state,
					true,
					this.buildAuthState(this._callbackUri, this._correlationState)
				);
				return;
			}

			const gmail = await this.connect();

			const completed =
				state.initialSyncComplete === true
					? await this.syncHistory(gmail, instanceId, state, retrievalCallback)
					: await this.syncMessageList(gmail, instanceId, state, retrievalCallback);

			if (completed) {
				// Flush the sync progress even when no message was delivered, a cycle which only
				// moved the page token or the history id on would otherwise repeat forever.
				await retrievalCallback(instanceId, undefined, state);
			}
		} catch (error) {
			const pollError = new GeneralError(
				GmailEmailConnector.CLASS_NAME,
				"pollFailed",
				undefined,
				BaseError.fromError(error)
			);

			if (this.isAuthFailure(error)) {
				// Only a token the provider rejected is cleared from the state. A client which is
				// misconfigured, or a mailbox the credentials may not read, still halts the mailbox
				// but must not discard a refresh token which is otherwise valid.
				if (this.isRefreshTokenRejected(error)) {
					state.refreshToken = undefined;
				}

				await authCallback(
					instanceId,
					state,
					true,
					this.buildAuthState(this._callbackUri, this._correlationState),
					pollError
				);
			} else {
				await retrievalCallback(instanceId, undefined, state, pollError);
			}
		} finally {
			Mutex.unlock(instanceId);
		}
	}

	/**
	 * Walk the existing mailbox contents one page per poll cycle, oldest message first.
	 * @param gmail The Gmail API client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The connector state for the instance.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if the page was fully processed, false if processing was aborted.
	 * @internal
	 */
	private async syncMessageList(
		gmail: GmailApi.Gmail,
		instanceId: string,
		state: IGmailEmailConnectorState,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		if (!Is.stringValue(state.historyId)) {
			// Record where the mailbox history stands before the first page is listed, so the
			// incremental sync which follows picks up everything that arrives in the meantime.
			const profile = await gmail.users.getProfile({ userId: this._config.emailAddress });
			state.historyId = Coerce.string(profile.data.historyId);
		}

		state.syncPageTokens ??= {};
		state.syncCompletedLabelIds ??= [];

		// The Gmail message list requires a message to carry every label it is given, so each
		// configured label is walked with its own call and its own cursor.
		for (const labelId of this._config.labelIds) {
			if (!state.syncCompletedLabelIds.includes(labelId)) {
				const continued = await this.syncLabelPage(
					gmail,
					instanceId,
					labelId,
					state,
					retrievalCallback
				);
				if (!continued) {
					return false;
				}
			}
		}

		if (state.syncCompletedLabelIds.length === this._config.labelIds.length) {
			state.initialSyncComplete = true;
			state.syncPageTokens = undefined;
			state.syncCompletedLabelIds = undefined;
		}

		return true;
	}

	/**
	 * Walk a single page of one label's existing messages, oldest message first.
	 * @param gmail The Gmail API client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param labelId The label to list.
	 * @param state The connector state for the instance.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if the page was fully processed, false if processing was aborted.
	 * @internal
	 */
	private async syncLabelPage(
		gmail: GmailApi.Gmail,
		instanceId: string,
		labelId: string,
		state: IGmailEmailConnectorState,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		const list = await gmail.users.messages.list({
			userId: this._config.emailAddress,
			labelIds: [labelId],
			maxResults: this._config.maxMessagesPerPoll,
			pageToken: state.syncPageTokens?.[labelId],
			includeSpamTrash: false
		});

		// The Gmail API returns the newest message first, deliver them in arrival order.
		const messageIds = (list.data.messages ?? [])
			.map(message => message.id)
			.filter((id): id is string => Is.stringValue(id))
			.reverse();

		const delivered = await this.deliverMessages(
			gmail,
			instanceId,
			messageIds,
			state,
			retrievalCallback
		);
		if (!delivered) {
			return false;
		}

		// Only move the cursor on once the whole page has been delivered, a page which failed
		// part way through is listed again on the next cycle.
		const nextPageToken = Coerce.string(list.data.nextPageToken);
		state.syncPageTokens ??= {};
		state.syncCompletedLabelIds ??= [];

		if (Is.stringValue(nextPageToken)) {
			state.syncPageTokens[labelId] = nextPageToken;
		} else {
			delete state.syncPageTokens[labelId];
			state.syncCompletedLabelIds = [...state.syncCompletedLabelIds, labelId];
		}

		return true;
	}

	/**
	 * Deliver the messages added to the mailbox since the last processed history record.
	 * @param gmail The Gmail API client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The connector state for the instance.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if all history records were processed, false if processing was aborted.
	 * @internal
	 */
	private async syncHistory(
		gmail: GmailApi.Gmail,
		instanceId: string,
		state: IGmailEmailConnectorState,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		const startHistoryId = state.historyId;
		if (!Is.stringValue(startHistoryId)) {
			// Nothing to resume from, fall back to walking the message list.
			state.initialSyncComplete = false;
			return true;
		}

		let pageToken: string | undefined;
		let mailboxHistoryId: string | undefined;
		let morePages = true;

		while (morePages) {
			if (!this._retrieving) {
				return false;
			}

			let response;
			try {
				// The history is mailbox wide and only accepts one label, so it is read unfiltered
				// and the added messages are matched against the configured labels below.
				response = await gmail.users.history.list({
					userId: this._config.emailAddress,
					startHistoryId,
					historyTypes: ["messageAdded"],
					pageToken
				});
			} catch (error) {
				if (!this.isHistoryExpired(error)) {
					throw error;
				}

				await this._logging?.log({
					level: "warn",
					source: GmailEmailConnector.CLASS_NAME,
					ts: Date.now(),
					message: "historyExpired"
				});

				// The stored history id has aged out of the mailbox history, so walk the message
				// list again from the start. Already delivered identifiers stop it duplicating.
				state.historyId = undefined;
				state.syncPageTokens = undefined;
				state.syncCompletedLabelIds = undefined;
				state.initialSyncComplete = false;
				return true;
			}

			for (const record of response.data.history ?? []) {
				const messageIds = (record.messagesAdded ?? [])
					.filter(added => this.matchesLabels(added.message?.labelIds))
					.map(added => added.message?.id)
					.filter((id): id is string => Is.stringValue(id));

				const delivered = await this.deliverMessages(
					gmail,
					instanceId,
					messageIds,
					state,
					retrievalCallback
				);
				if (!delivered) {
					return false;
				}

				// Only move the cursor on once every message in the record has been delivered, a
				// record which failed part way through is replayed on the next cycle.
				state.historyId = Coerce.string(record.id) ?? state.historyId;
			}

			pageToken = Coerce.string(response.data.nextPageToken);
			mailboxHistoryId = Coerce.string(response.data.historyId);
			morePages = Is.stringValue(pageToken);
		}

		if (Is.stringValue(mailboxHistoryId)) {
			// Every record was processed, so move to the head of the mailbox history. This also
			// skips the change types the connector does not act on.
			state.historyId = mailboxHistoryId;
		}

		return true;
	}

	/**
	 * Fetch and deliver each of the given messages in order.
	 * Messages already recorded in the state are skipped.
	 * @param gmail The Gmail API client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param messageIds The identifiers of the messages to deliver, in arrival order.
	 * @param state The connector state for the instance.
	 * @param retrievalCallback Callback invoked for each parsed email; return false to abort.
	 * @returns True if all messages were processed, false if processing was aborted.
	 * @internal
	 */
	private async deliverMessages(
		gmail: GmailApi.Gmail,
		instanceId: string,
		messageIds: string[],
		state: IGmailEmailConnectorState,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		for (const messageId of messageIds) {
			if (!this._retrieving) {
				return false;
			}

			const alreadyDelivered = state.deliveredMessageIds?.includes(messageId) ?? false;
			if (!alreadyDelivered) {
				const email = await this.fetchEmail(gmail, messageId);

				if (Is.notEmpty(email)) {
					await this._logging?.log({
						level: "info",
						source: GmailEmailConnector.CLASS_NAME,
						ts: Date.now(),
						message: "emailReceived",
						data: { subject: email.subject }
					});

					// Record the delivery before the callback runs so the identifier is part of the
					// state the caller persists, then wind it back if the caller reports a failure.
					const previousDelivered = state.deliveredMessageIds;
					this.recordDelivered(state, messageId);

					const shouldContinue = await retrievalCallback(instanceId, email, state);
					if (!shouldContinue) {
						state.deliveredMessageIds = previousDelivered;
						return false;
					}
				}
			}
		}

		return true;
	}

	/**
	 * Fetch a single message and parse it into an email.
	 * @param gmail The Gmail API client.
	 * @param messageId The identifier of the message to fetch.
	 * @returns The parsed email, or undefined if the message carried no content.
	 * @internal
	 */
	private async fetchEmail(gmail: GmailApi.Gmail, messageId: string): Promise<IEmail | undefined> {
		const response = await gmail.users.messages.get({
			userId: this._config.emailAddress,
			id: messageId,
			format: "raw"
		});

		const raw = Coerce.string(response.data.raw);
		if (!Is.stringValue(raw)) {
			return undefined;
		}

		return MailHelper.parseEmail(
			Converter.bytesToUtf8(Converter.base64UrlToBytes(raw)),
			response.data.labelIds ?? undefined
		);
	}

	/**
	 * Whether a message carries any of the configured labels.
	 * @param labelIds The labels on the message.
	 * @returns True if the message should be delivered.
	 * @internal
	 */
	private matchesLabels(labelIds: string[] | null | undefined): boolean {
		return (labelIds ?? []).some(labelId => this._config.labelIds.includes(labelId));
	}

	/**
	 * Record a message identifier as delivered, trimming the oldest entries.
	 * @param state The connector state to update.
	 * @param messageId The identifier of the delivered message.
	 * @internal
	 */
	private recordDelivered(state: IGmailEmailConnectorState, messageId: string): void {
		// Replace rather than mutate, the previous array is kept so the record can be wound back.
		const delivered = [...(state.deliveredMessageIds ?? []), messageId];
		state.deliveredMessageIds = delivered.slice(-this._config.maxDeliveredIdHistory);
	}
}

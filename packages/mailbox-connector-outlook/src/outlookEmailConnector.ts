// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	ConfidentialClientApplication,
	type AccountInfo,
	type AuthenticationResult,
	type JsonCache,
	type NodeAuthOptions
} from "@azure/msal-node";
import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
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
	IEmail,
	IEmailProtocolConnector,
	IEmailProtocolConnectorAuthCallback,
	IEmailProtocolConnectorAuthState,
	IEmailProtocolConnectorOptions,
	IEmailProtocolConnectorRetrievalCallback
} from "@twin.org/mailbox-models";
import { MailHelper } from "@twin.org/mailbox-models";
import { nameof } from "@twin.org/nameof";
import type { IOutlookDeltaMessage } from "./models/IOutlookDeltaMessage.js";
import type { IOutlookDeltaPage } from "./models/IOutlookDeltaPage.js";
import type { IOutlookEmailConnectorConfig } from "./models/IOutlookEmailConnectorConfig.js";
import type { IOutlookEmailConnectorConstructorOptions } from "./models/IOutlookEmailConnectorConstructorOptions.js";
import type { IOutlookEmailConnectorState } from "./models/IOutlookEmailConnectorState.js";
import { initSchema } from "./schema.js";

/**
 * Outlook email protocol connector. Monitors a mailbox for new messages using Microsoft Graph.
 */
export class OutlookEmailConnector implements IEmailProtocolConnector<IOutlookEmailConnectorState> {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<OutlookEmailConnector>();

	/**
	 * The protocol namespace identifier.
	 */
	public static readonly NAMESPACE: string = "outlook";

	/**
	 * The Microsoft identity platform host the app registration authenticates against.
	 * @internal
	 */
	private static readonly _AUTHORITY_HOST: string = "https://login.microsoftonline.com";

	/**
	 * The delegated scope the connector requires on the mailbox. The scopes which issue the
	 * refresh token are added by the identity library, so they are not named here.
	 * @internal
	 */
	private static readonly _DELEGATED_SCOPES: string[] = ["https://graph.microsoft.com/Mail.Read"];

	/**
	 * The scope which asks for the application permissions the app registration was granted,
	 * used when the mailbox is accessed without a user present to give consent.
	 * @internal
	 */
	private static readonly _APP_ONLY_SCOPES: string[] = ["https://graph.microsoft.com/.default"];

	/**
	 * The properties a delta cursor reports for each message, enough to order the deliveries and
	 * to carry the protocol flags. The content is fetched separately as its raw MIME.
	 * @internal
	 */
	private static readonly _DELTA_SELECT: string[] = ["id", "receivedDateTime", "categories"];

	/**
	 * The OAuth 2.0 error codes which mean the mailbox cannot authenticate as it is configured.
	 * @internal
	 */
	private static readonly _OAUTH_FAILURE_CODES: string[] = [
		"invalid_grant",
		"invalid_client",
		"unauthorized_client",
		"interaction_required",
		"consent_required",
		"login_required"
	];

	/**
	 * The OAuth 2.0 error codes which mean the cached refresh token itself is no longer valid.
	 * The other failure codes describe the client rather than the token, so they must not cause
	 * a working token to be discarded.
	 * @internal
	 */
	private static readonly _OAUTH_TOKEN_REJECTED_CODES: string[] = [
		"invalid_grant",
		"interaction_required",
		"consent_required",
		"login_required"
	];

	/**
	 * The response property carrying the link to the next page of a delta cursor.
	 * @internal
	 */
	private static readonly _NEXT_LINK_KEY = "@odata.nextLink";

	/**
	 * The response property carrying the link which resumes a delta cursor on a later poll.
	 * @internal
	 */
	private static readonly _DELTA_LINK_KEY = "@odata.deltaLink";

	/**
	 * The delta entry property marking a message which has left the folder rather than arrived.
	 * @internal
	 */
	private static readonly _REMOVED_KEY = "@removed";

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
			IOutlookEmailConnectorConfig,
			| "emailAddress"
			| "tenantId"
			| "clientId"
			| "appOnlyAccess"
			| "folderIds"
			| "maxMessagesPerPoll"
			| "maxDeliveredIdHistory"
			| "pollingIntervalMinutes"
		>
	> &
		Pick<IOutlookEmailConnectorConfig, "clientSecret" | "clientCertificate" | "mutexTimeoutMs">;

	/**
	 * The confidential client used to authenticate Microsoft Graph calls.
	 * @internal
	 */
	private readonly _authClient: ConfidentialClientApplication;

	/**
	 * The Microsoft Graph client, created on the first poll and reused afterwards.
	 * @internal
	 */
	private _graph?: Client;

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
	private _state?: IOutlookEmailConnectorState;

	/**
	 * The serialized token cache which has been loaded into the identity library, so a cache the
	 * connector itself refreshed is not overwritten by the copy the state was handed with.
	 * @internal
	 */
	private _appliedTokenCache?: string;

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
	 * Create a new instance of OutlookEmailConnector.
	 * @param options The options for the connector.
	 * @throws GeneralError if neither a client secret nor a client certificate is supplied.
	 */
	constructor(options: IOutlookEmailConnectorConstructorOptions) {
		Guards.object(OutlookEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.object(OutlookEmailConnector.CLASS_NAME, nameof(options.config), options.config);
		Guards.stringValue(
			OutlookEmailConnector.CLASS_NAME,
			nameof(options.config.emailAddress),
			options.config.emailAddress
		);
		Guards.stringValue(
			OutlookEmailConnector.CLASS_NAME,
			nameof(options.config.tenantId),
			options.config.tenantId
		);
		Guards.stringValue(
			OutlookEmailConnector.CLASS_NAME,
			nameof(options.config.clientId),
			options.config.clientId
		);

		// The refresh token is deliberately not required, a mailbox can be created with just the
		// app registration credentials and the connector then drives the consent flow through the
		// auth callback.
		if (
			!Is.stringValue(options.config.clientSecret) &&
			!Is.stringValue(options.config.clientCertificate)
		) {
			throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "missingClientCredential");
		}

		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(options.loggingComponentType);

		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options.taskSchedulerComponentType ?? "task-scheduler"
		);

		this._config = {
			emailAddress: options.config.emailAddress,
			tenantId: options.config.tenantId,
			clientId: options.config.clientId,
			clientSecret: options.config.clientSecret,
			clientCertificate: options.config.clientCertificate,
			appOnlyAccess: options.config.appOnlyAccess ?? false,
			folderIds: Is.arrayValue(options.config.folderIds) ? options.config.folderIds : ["inbox"],
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
		return OutlookEmailConnector.CLASS_NAME;
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
		state: IOutlookEmailConnectorState,
		authCallback: IEmailProtocolConnectorAuthCallback,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback,
		options: IEmailProtocolConnectorOptions
	): Promise<void> {
		Guards.object(OutlookEmailConnector.CLASS_NAME, nameof(options), options);

		// The callback URI is only needed to produce a consent URL, so a mailbox which already
		// holds credentials still polls without one.
		await this.retrieveStop();

		this._retrieving = true;
		this._instanceId = instanceId;
		this._state = state;
		this._callbackUri = options.callbackUri;
		this._correlationState = options.correlationState;
		this._authCallback = authCallback;

		// The token cache arrives with the state rather than the configuration, so whatever the
		// identity library was holding for a previous instance is no longer what applies.
		this._appliedTokenCache = undefined;

		await this._taskScheduler.addTask(
			instanceId,
			[{ intervalMinutes: this._config.pollingIntervalMinutes }],
			async () => {
				await this.poll(authCallback, retrievalCallback);
			}
		);
	}

	/**
	 * Start the consent flow for a mailbox which has no credentials yet.
	 * @param instanceId The identifier of the mailbox instance being authenticated.
	 * @param state The current connector state for the instance.
	 * @param options Options supplied by the owning component, carrying the consent callback URI
	 * and the state which correlates the consent response back to the mailbox.
	 * @returns The auth state carrying the consent URL to open, or undefined when the mailbox can
	 * already authenticate itself from application permissions or a token cache in its state.
	 */
	public async initiateAuth(
		instanceId: string,
		state: IOutlookEmailConnectorState,
		options: IEmailProtocolConnectorOptions
	): Promise<IEmailProtocolConnectorAuthState | undefined> {
		Guards.object(OutlookEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.stringValue(
			OutlookEmailConnector.CLASS_NAME,
			nameof(options.callbackUri),
			options.callbackUri
		);

		if (!(await this.needsConsent(state))) {
			return undefined;
		}

		return this.buildAuthState(options.callbackUri, options.correlationState);
	}

	/**
	 * Complete the consent flow with the authorisation code handed to the redirect URI.
	 * The issued credentials are applied to this connector instance so the next poll uses them,
	 * and the token cache holding the refresh token is placed in the state reported through the
	 * auth callback given by retrieve, so the owning component vaults it and lifts the
	 * authentication halt.
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
		Guards.object(OutlookEmailConnector.CLASS_NAME, nameof(options), options);
		Guards.stringValue(
			OutlookEmailConnector.CLASS_NAME,
			nameof(options.callbackUri),
			options.callbackUri
		);

		const payload = Is.object<{ code?: unknown }>(authPayload) ? authPayload : undefined;
		const code = Coerce.string(payload?.code);
		Guards.stringValue(OutlookEmailConnector.CLASS_NAME, nameof(code), code);

		// The authorisation code can only be exchanged once, so the connector refuses before
		// spending it if it has no callback to report the issued credentials through.
		if (Is.empty(this._authCallback)) {
			throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "authFlowNotStarted");
		}

		let result: AuthenticationResult;
		try {
			// Microsoft requires the same redirect the consent URL was produced with.
			result = await this._authClient.acquireTokenByCode({
				code,
				scopes: OutlookEmailConnector._DELEGATED_SCOPES,
				redirectUri: options.callbackUri
			});
		} catch (error) {
			throw new GeneralError(
				OutlookEmailConnector.CLASS_NAME,
				"authCodeExchangeFailed",
				undefined,
				BaseError.fromError(error)
			);
		}

		const accountId = await this.guardConsentedAccount(result);

		// The exchange fills the cache, which is what carries the refresh token the connector
		// polls with, so it is the cache rather than the result which is persisted.
		const serializedCache = this._authClient.getTokenCache().serialize();

		if (!this.holdsRefreshToken(serializedCache)) {
			throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "noRefreshTokenIssued");
		}

		const state = this._state ?? {};
		state.tokenCache = serializedCache;
		state.accountId = accountId;
		this._state = state;
		this._appliedTokenCache = serializedCache;

		// Continue the workflow through the auth callback, which clears the halt and persists the
		// state, where the state schema marks the token cache as a vaulted field. A restarted
		// connector is then handed the state with the credentials already in place.
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
	 * @throws GeneralError if the client certificate is not valid JSON containing a key pair.
	 * @internal
	 */
	private createAuthClient(): ConfidentialClientApplication {
		const auth: NodeAuthOptions = {
			clientId: this._config.clientId,
			authority: `${OutlookEmailConnector._AUTHORITY_HOST}/${this._config.tenantId}`
		};

		if (Is.stringValue(this._config.clientCertificate)) {
			const certificate = Coerce.object<{
				privateKey?: string;
				thumbprint?: string;
				thumbprintSha256?: string;
				x5c?: string;
			}>(this._config.clientCertificate);

			const privateKey = certificate?.privateKey;
			const thumbprintSha256 = certificate?.thumbprintSha256;
			const thumbprint = certificate?.thumbprint;
			if (
				!Is.stringValue(privateKey) ||
				!(Is.stringValue(thumbprintSha256) || Is.stringValue(thumbprint))
			) {
				throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "invalidClientCertificate");
			}

			auth.clientCertificate = {
				privateKey,
				thumbprintSha256,
				thumbprint,
				x5c: certificate?.x5c
			};
		} else {
			auth.clientSecret = this._config.clientSecret;
		}

		// The redirect URI is not set here, it is passed explicitly on the calls which need it so
		// the value always matches the one the owning component supplied.
		// The token cache is not loaded here, it lives in the connector state and is applied once
		// retrieve or the consent flow supplies it.
		return new ConfidentialClientApplication({ auth });
	}

	/**
	 * Load the token cache the state carries into the identity library.
	 * @param state The connector state holding the cache the consent flow filled.
	 * @internal
	 */
	private applyTokenCache(state: IOutlookEmailConnectorState | undefined): void {
		// Loading the cache replaces whatever the library holds, so a cache it refreshed itself
		// must not be overwritten by the older copy the state was handed with.
		if (Is.stringValue(state?.tokenCache) && state.tokenCache !== this._appliedTokenCache) {
			this._authClient.getTokenCache().deserialize(state.tokenCache);
			this._appliedTokenCache = state.tokenCache;
		}
	}

	/**
	 * Record the token cache on the state when the identity library has changed it, such as after
	 * a refresh token was exchanged for a new access token.
	 * @param state The connector state to update.
	 * @returns The state the cache was recorded on.
	 * @internal
	 */
	private captureTokenCache(state: IOutlookEmailConnectorState): IOutlookEmailConnectorState {
		const cache = this._authClient.getTokenCache();

		if (cache.hasChanged()) {
			const serialized = cache.serialize();
			state.tokenCache = serialized;
			this._appliedTokenCache = serialized;
		}

		return state;
	}

	/**
	 * Whether a serialized token cache holds a refresh token, without which the mailbox could not
	 * be polled after a restart.
	 * @param serializedCache The serialized token cache to inspect.
	 * @returns True if the cache holds a refresh token.
	 * @internal
	 */
	private holdsRefreshToken(serializedCache: string): boolean {
		const cache = Coerce.object<JsonCache>(serializedCache);

		return Is.objectValue(cache?.RefreshToken);
	}

	/**
	 * Verify the account which gave consent is the mailbox the connector is configured for.
	 * @param result The result of the authorisation code exchange.
	 * @returns The identifier the account is found in the token cache by.
	 * @throws GeneralError if the consent was given for a different account.
	 * @internal
	 */
	private async guardConsentedAccount(result: AuthenticationResult): Promise<string> {
		// The correlating state travels through the browser, so consent can come back from an
		// account other than the one the mailbox names. Binding the mailbox to it would ingest
		// somebody else's email, so the issued credentials are checked before they are reported.
		const consentedAddress = Coerce.string(result.account?.username);
		const accountId = Coerce.string(result.account?.homeAccountId);

		if (
			consentedAddress?.toLowerCase() !== this._config.emailAddress.toLowerCase() ||
			!Is.stringValue(accountId)
		) {
			// The exchange has already filled the cache, so the account it issued credentials for
			// is dropped rather than left behind for a later poll to authenticate with.
			if (Is.notEmpty(result.account)) {
				await this._authClient.getTokenCache().removeAccount(result.account);
			}

			throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "consentAccountMismatch", {
				emailAddress: this._config.emailAddress
			});
		}

		return accountId;
	}

	/**
	 * Whether the connector is still waiting for the consent flow to supply credentials.
	 * @param state The connector state holding any token cache the consent flow has filled.
	 * @returns True if consent is required before the mailbox can be polled.
	 * @internal
	 */
	private async needsConsent(state: IOutlookEmailConnectorState | undefined): Promise<boolean> {
		if (this._config.appOnlyAccess) {
			return false;
		}

		if (!Is.stringValue(state?.tokenCache) || !Is.stringValue(state.accountId)) {
			return true;
		}

		// A cache which holds no account for the mailbox cannot produce a token for it, which
		// happens when a cache is restored without the account the consent flow recorded.
		this.applyTokenCache(state);
		return Is.empty(await this.consentedAccount(state));
	}

	/**
	 * Find the account in the token cache the consent flow issued the credentials for.
	 * @param state The connector state naming the account.
	 * @returns The account, or undefined if the cache holds none for the mailbox.
	 * @internal
	 */
	private async consentedAccount(
		state: IOutlookEmailConnectorState | undefined
	): Promise<AccountInfo | undefined> {
		if (!Is.stringValue(state?.accountId)) {
			return undefined;
		}

		// The account is found by the identifier the consent flow recorded rather than by the
		// mailbox address, as the address on a cached account is only populated from the identity
		// token the sign in returned.
		const account = await this._authClient.getTokenCache().getAccountByHomeId(state.accountId);

		return account ?? undefined;
	}

	/**
	 * Build the auth state describing how the mailbox can be authenticated.
	 * @param callbackUri The URI the consent flow returns to.
	 * @param correlationState The value the consent flow carries back so the response correlates
	 * to the mailbox it belongs to.
	 * @returns The auth state, or undefined if no consent URL can be produced.
	 * @internal
	 */
	private async buildAuthState(
		callbackUri: string | undefined,
		correlationState: string | undefined
	): Promise<IEmailProtocolConnectorAuthState | undefined> {
		if (this._config.appOnlyAccess) {
			return undefined;
		}

		if (!Is.stringValue(callbackUri) || !Is.stringValue(correlationState)) {
			return undefined;
		}

		return {
			authUrl: await this._authClient.getAuthCodeUrl({
				scopes: OutlookEmailConnector._DELEGATED_SCOPES,
				redirectUri: callbackUri,
				loginHint: this._config.emailAddress,
				prompt: "consent",
				// The callback URI is fixed for the deployment, so the owning component supplies
				// the value which correlates the response back to the mailbox and its partition.
				state: correlationState
			})
		};
	}

	/**
	 * Build the auth state to report alongside a poll outcome, where a mailbox which cannot be
	 * given a consent URL still has to be reported as needing authentication.
	 * @param callbackUri The URI the consent flow returns to.
	 * @param correlationState The value the consent flow carries back.
	 * @returns The auth state, or undefined if no consent URL could be produced.
	 * @internal
	 */
	private async tryBuildAuthState(
		callbackUri: string | undefined,
		correlationState: string | undefined
	): Promise<IEmailProtocolConnectorAuthState | undefined> {
		try {
			return await this.buildAuthState(callbackUri, correlationState);
		} catch (error) {
			// Producing the URL reaches the identity platform for its metadata, so it can fail on
			// its own. The mailbox still has to be reported as halted, just without somewhere to
			// send the operator.
			await this._logging?.log({
				level: "warn",
				source: OutlookEmailConnector.CLASS_NAME,
				ts: Date.now(),
				message: "consentUrlFailed",
				error: BaseError.fromError(error)
			});

			return undefined;
		}
	}

	/**
	 * Get the Microsoft Graph client, refreshing the access token if it has expired.
	 * @returns The Microsoft Graph client.
	 * @internal
	 */
	private async connect(): Promise<Client> {
		// Acquiring a token before the client is used exchanges the refresh token or the client
		// credential for a new one whenever the cached token has expired, so no manual
		// intervention is needed, and a rejected credential is reported before any mail is read.
		await this.acquireAccessToken();

		this._graph ??= Client.initWithMiddleware({
			authProvider: { getAccessToken: async () => this.acquireAccessToken() }
		});
		return this._graph;
	}

	/**
	 * Acquire an access token for the mailbox, refreshing it when the cached one has expired.
	 * @returns The access token.
	 * @throws GeneralError if no token could be acquired for the mailbox.
	 * @internal
	 */
	private async acquireAccessToken(): Promise<string> {
		let result: AuthenticationResult | null;

		if (this._config.appOnlyAccess) {
			result = await this._authClient.acquireTokenByClientCredential({
				scopes: OutlookEmailConnector._APP_ONLY_SCOPES
			});
		} else {
			this.applyTokenCache(this._state);

			const account = await this.consentedAccount(this._state);
			if (Is.empty(account)) {
				throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "mailboxNotConsented", {
					emailAddress: this._config.emailAddress
				});
			}

			result = await this._authClient.acquireTokenSilent({
				account,
				scopes: OutlookEmailConnector._DELEGATED_SCOPES
			});

			// A silent acquisition which had to use the refresh token leaves a new one behind, so
			// the cache is recorded on the state for the owning component to vault.
			if (Is.notEmpty(this._state)) {
				this.captureTokenCache(this._state);
			}
		}

		const accessToken = Coerce.string(result?.accessToken);
		if (!Is.stringValue(accessToken)) {
			throw new GeneralError(OutlookEmailConnector.CLASS_NAME, "noAccessTokenIssued");
		}

		return accessToken;
	}

	/**
	 * Determine whether an error reports that the stored credentials were rejected.
	 * @param error The error thrown by Microsoft Graph or the token endpoint.
	 * @returns True if the error requires the mailbox to be re-authenticated.
	 * @internal
	 */
	private isAuthFailure(error: unknown): boolean {
		const status = this.errorStatus(error);

		// Microsoft Graph reports a throttled request as 429 and an overloaded service as 503, so
		// 403 is a mailbox the credentials may not read rather than a cycle to retry.
		if (status === 401 || status === 403) {
			return true;
		}

		const failureCode = this.oauthFailureCode(error);
		return (
			Is.stringValue(failureCode) &&
			OutlookEmailConnector._OAUTH_FAILURE_CODES.includes(failureCode)
		);
	}

	/**
	 * Determine whether an error reports that the cached refresh token is no longer valid.
	 * @param error The error thrown by Microsoft Graph or the token endpoint.
	 * @returns True if the refresh token has expired or been revoked and has to be replaced.
	 * @internal
	 */
	private isRefreshTokenRejected(error: unknown): boolean {
		const failureCode = this.oauthFailureCode(error);
		return (
			Is.stringValue(failureCode) &&
			OutlookEmailConnector._OAUTH_TOKEN_REJECTED_CODES.includes(failureCode)
		);
	}

	/**
	 * Determine whether an error reports that the stored delta cursor is too old to use.
	 * @param error The error thrown by the Microsoft Graph delta query.
	 * @returns True if the delta cursor has aged out and the folder has to be walked again.
	 * @internal
	 */
	private isDeltaExpired(error: unknown): boolean {
		return this.errorStatus(error) === 410;
	}

	/**
	 * Extract the HTTP status code from a Microsoft Graph error.
	 * @param error The error to inspect.
	 * @returns The status code, or undefined if the error carries none.
	 * @internal
	 */
	private errorStatus(error: unknown): number | undefined {
		const details = Is.object<{
			statusCode?: unknown;
			status?: unknown;
			response?: { status?: unknown };
		}>(error)
			? error
			: undefined;

		return (
			Coerce.number(details?.statusCode) ??
			Coerce.number(details?.status) ??
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
		const details = Is.object<{ errorCode?: unknown; message?: unknown }>(error)
			? error
			: undefined;

		// The identity library names the code on the error it raises, the mailbox having no
		// consented account is reported by the connector itself.
		const errorCode = Coerce.string(details?.errorCode);
		if (Is.stringValue(errorCode)) {
			return errorCode;
		}

		const message = Coerce.string(details?.message);
		return OutlookEmailConnector._OAUTH_FAILURE_CODES.find(code => message?.includes(code));
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
			if (await this.needsConsent(state)) {
				await this._logging?.log({
					level: "warn",
					source: OutlookEmailConnector.CLASS_NAME,
					ts: Date.now(),
					message: "consentRequired",
					data: { mailboxId: instanceId }
				});

				// Hand the consent URL back through the auth callback and wait for the flow to
				// complete, the mailbox has no credentials to authenticate Microsoft Graph with.
				await authCallback(
					instanceId,
					state,
					true,
					await this.tryBuildAuthState(this._callbackUri, this._correlationState)
				);
				return;
			}

			const graph = await this.connect();

			// The bound is fixed for the whole cycle, a sync spread over several polls would
			// otherwise start skipping the pages which carry the older mail.
			const deliverFrom =
				state.initialSyncComplete === true ? state.lastReceivedDateTime : state.syncFromDateTime;

			const completed =
				state.initialSyncComplete === true
					? await this.syncDelta(graph, instanceId, state, deliverFrom, retrievalCallback)
					: await this.syncFolders(graph, instanceId, state, deliverFrom, retrievalCallback);

			if (completed) {
				// Flush the sync progress even when no message was delivered, a cycle which only
				// moved a page link or a delta cursor on would otherwise repeat forever.
				await retrievalCallback(instanceId, undefined, state);
			}
		} catch (error) {
			const pollError = new GeneralError(
				OutlookEmailConnector.CLASS_NAME,
				"pollFailed",
				undefined,
				BaseError.fromError(error)
			);

			if (this.isAuthFailure(error)) {
				// Only credentials the provider rejected are cleared from the state. A client which
				// is misconfigured, or a mailbox the credentials may not read, still halts the
				// mailbox but must not discard a token cache which is otherwise valid.
				if (this.isRefreshTokenRejected(error)) {
					state.tokenCache = undefined;
					state.accountId = undefined;
					this._appliedTokenCache = undefined;
				}

				await authCallback(
					instanceId,
					state,
					true,
					await this.tryBuildAuthState(this._callbackUri, this._correlationState),
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
	 * Walk the existing folder contents one page per poll cycle.
	 * @param graph The Microsoft Graph client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The connector state for the instance.
	 * @param deliverFrom The receipt time to deliver from, or undefined to deliver everything.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if the page was fully processed, false if processing was aborted.
	 * @internal
	 */
	private async syncFolders(
		graph: Client,
		instanceId: string,
		state: IOutlookEmailConnectorState,
		deliverFrom: string | undefined,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		state.syncNextLinks ??= {};
		state.syncCompletedFolderIds ??= [];

		// A delta cursor is per folder, so each configured folder is walked with its own link.
		for (const folderId of this._config.folderIds) {
			if (!state.syncCompletedFolderIds.includes(folderId)) {
				const continued = await this.syncFolderPage(
					graph,
					instanceId,
					folderId,
					state,
					deliverFrom,
					retrievalCallback
				);
				if (!continued) {
					return false;
				}
			}
		}

		if (state.syncCompletedFolderIds.length === this._config.folderIds.length) {
			state.initialSyncComplete = true;
			state.syncNextLinks = undefined;
			state.syncCompletedFolderIds = undefined;
			state.syncFromDateTime = undefined;
		}

		return true;
	}

	/**
	 * Walk a single page of one folder's existing messages.
	 * @param graph The Microsoft Graph client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param folderId The folder to walk.
	 * @param state The connector state for the instance.
	 * @param deliverFrom The receipt time to deliver from, or undefined to deliver everything.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if the page was fully processed, false if processing was aborted.
	 * @internal
	 */
	private async syncFolderPage(
		graph: Client,
		instanceId: string,
		folderId: string,
		state: IOutlookEmailConnectorState,
		deliverFrom: string | undefined,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		const link = state.syncNextLinks?.[folderId] ?? this.deltaPath(folderId);
		const page = await this.readDeltaPage(graph, link);

		const delivered = await this.deliverMessages(
			graph,
			instanceId,
			page.messages,
			state,
			deliverFrom,
			retrievalCallback
		);
		if (!delivered) {
			return false;
		}

		// Only move the cursor on once the whole page has been delivered, a page which failed
		// part way through is read again on the next cycle.
		state.syncNextLinks ??= {};
		state.syncCompletedFolderIds ??= [];

		if (Is.stringValue(page.nextLink)) {
			state.syncNextLinks[folderId] = page.nextLink;
		} else {
			delete state.syncNextLinks[folderId];
			state.syncCompletedFolderIds = [...state.syncCompletedFolderIds, folderId];

			// The final page of a walk carries the cursor the incremental sync resumes from.
			if (Is.stringValue(page.deltaLink)) {
				state.deltaLinks = { ...state.deltaLinks, [folderId]: page.deltaLink };
			}
		}

		return true;
	}

	/**
	 * Deliver the messages each folder's delta cursor reports as new.
	 * @param graph The Microsoft Graph client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param state The connector state for the instance.
	 * @param deliverFrom The receipt time to deliver from, or undefined to deliver everything.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if all folders were processed, false if processing was aborted.
	 * @internal
	 */
	private async syncDelta(
		graph: Client,
		instanceId: string,
		state: IOutlookEmailConnectorState,
		deliverFrom: string | undefined,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		for (const folderId of this._config.folderIds) {
			const deltaLink = state.deltaLinks?.[folderId];

			if (!Is.stringValue(deltaLink)) {
				// Nothing to resume from, fall back to walking the folders.
				state.initialSyncComplete = false;
				return true;
			}

			const continued = await this.syncFolderDelta(
				graph,
				instanceId,
				folderId,
				deltaLink,
				state,
				deliverFrom,
				retrievalCallback
			);
			if (!continued) {
				return false;
			}

			if (state.initialSyncComplete !== true) {
				// The cursor expired and the folders are being walked again, so the remaining
				// cursors are followed on a later cycle rather than mixed into this one.
				return true;
			}
		}

		return true;
	}

	/**
	 * Follow one folder's delta cursor to the head of its changes.
	 * @param graph The Microsoft Graph client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param folderId The folder whose cursor is being followed.
	 * @param deltaLink The cursor to resume from.
	 * @param state The connector state for the instance.
	 * @param deliverFrom The receipt time to deliver from, or undefined to deliver everything.
	 * @param retrievalCallback Callback invoked for each parsed email.
	 * @returns True if all pages were processed, false if processing was aborted.
	 * @internal
	 */
	private async syncFolderDelta(
		graph: Client,
		instanceId: string,
		folderId: string,
		deltaLink: string,
		state: IOutlookEmailConnectorState,
		deliverFrom: string | undefined,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		let link: string | undefined = deltaLink;

		while (Is.stringValue(link)) {
			if (!this._retrieving) {
				return false;
			}

			let page: IOutlookDeltaPage;
			try {
				page = await this.readDeltaPage(graph, link);
			} catch (error) {
				if (!this.isDeltaExpired(error)) {
					throw error;
				}

				await this._logging?.log({
					level: "warn",
					source: OutlookEmailConnector.CLASS_NAME,
					ts: Date.now(),
					message: "deltaExpired",
					data: { folderId }
				});

				// The cursor has aged out, so walk the folders again from the start. The already
				// delivered identifiers and the receipt time the walk delivers from stop the mail
				// which has already been handed over being handed over a second time.
				state.deltaLinks = undefined;
				state.syncNextLinks = undefined;
				state.syncCompletedFolderIds = undefined;
				state.syncFromDateTime = state.lastReceivedDateTime;
				state.initialSyncComplete = false;
				return true;
			}

			const delivered = await this.deliverMessages(
				graph,
				instanceId,
				page.messages,
				state,
				deliverFrom,
				retrievalCallback
			);
			if (!delivered) {
				return false;
			}

			// Only move the cursor on once the whole page has been delivered, a page which failed
			// part way through is read again on the next cycle.
			const followOn = page.nextLink ?? page.deltaLink;
			if (Is.stringValue(followOn)) {
				state.deltaLinks = { ...state.deltaLinks, [folderId]: followOn };
			}

			link = page.nextLink;
		}

		return true;
	}

	/**
	 * Read a single page of a delta cursor.
	 * @param graph The Microsoft Graph client.
	 * @param link The path which starts the cursor, or the absolute link which continues it.
	 * @returns The messages the page carries and the links which follow it.
	 * @internal
	 */
	private async readDeltaPage(graph: Client, link: string): Promise<IOutlookDeltaPage> {
		const response = await graph.api(link).get();

		const page = Is.object<{ [key: string]: unknown; value?: unknown }>(response)
			? response
			: undefined;
		const entries = Is.arrayValue<IOutlookDeltaMessage & { [key: string]: unknown }>(page?.value)
			? page.value
			: [];

		return {
			// A message which has left the folder is reported alongside the arrivals, and there is
			// nothing to fetch for it.
			messages: entries.filter(
				entry => Is.stringValue(entry.id) && Is.empty(entry[OutlookEmailConnector._REMOVED_KEY])
			),
			nextLink: Coerce.string(page?.[OutlookEmailConnector._NEXT_LINK_KEY]),
			deltaLink: Coerce.string(page?.[OutlookEmailConnector._DELTA_LINK_KEY])
		};
	}

	/**
	 * Fetch and deliver each of the given messages, oldest message first.
	 * Messages already recorded in the state, and messages which arrived before the point
	 * delivery has reached, are skipped.
	 * @param graph The Microsoft Graph client.
	 * @param instanceId The identifier of the mailbox instance being polled.
	 * @param messages The messages the delta cursor reported.
	 * @param state The connector state for the instance.
	 * @param deliverFrom The receipt time to deliver from, or undefined to deliver everything.
	 * @param retrievalCallback Callback invoked for each parsed email; return false to abort.
	 * @returns True if all messages were processed, false if processing was aborted.
	 * @internal
	 */
	private async deliverMessages(
		graph: Client,
		instanceId: string,
		messages: IOutlookDeltaMessage[],
		state: IOutlookEmailConnectorState,
		deliverFrom: string | undefined,
		retrievalCallback: IEmailProtocolConnectorRetrievalCallback
	): Promise<boolean> {
		// A delta cursor does not order what it reports, so deliver them in arrival order.
		const ordered = [...messages].sort(
			(first, second) =>
				this.receivedAt(first.receivedDateTime) - this.receivedAt(second.receivedDateTime)
		);

		for (const message of ordered) {
			if (!this._retrieving) {
				return false;
			}

			if (this.isNewArrival(message, state, deliverFrom)) {
				const email = await this.fetchEmail(graph, message.id, message.categories);

				if (Is.notEmpty(email)) {
					await this._logging?.log({
						level: "info",
						source: OutlookEmailConnector.CLASS_NAME,
						ts: Date.now(),
						message: "emailReceived",
						data: { subject: email.subject }
					});

					// Record the delivery before the callback runs so the identifier is part of the
					// state the caller persists, then wind it back if the caller reports a failure.
					const previousDelivered = state.deliveredMessageIds;
					const previousReceived = state.lastReceivedDateTime;
					this.recordDelivered(state, message);

					const shouldContinue = await retrievalCallback(instanceId, email, state);
					if (!shouldContinue) {
						state.deliveredMessageIds = previousDelivered;
						state.lastReceivedDateTime = previousReceived;
						return false;
					}
				}
			}
		}

		return true;
	}

	/**
	 * Whether a message the delta cursor reported is one which has not been delivered yet.
	 * @param message The message the delta cursor reported.
	 * @param state The connector state for the instance.
	 * @param deliverFrom The receipt time to deliver from, or undefined to deliver everything.
	 * @returns True if the message should be delivered.
	 * @internal
	 */
	private isNewArrival(
		message: IOutlookDeltaMessage,
		state: IOutlookEmailConnectorState,
		deliverFrom: string | undefined
	): boolean {
		if (state.deliveredMessageIds?.includes(message.id) ?? false) {
			return false;
		}

		if (!Is.stringValue(deliverFrom)) {
			return true;
		}

		// A delta cursor reports a message again whenever any of its properties change, such as
		// its read state, so a message which arrived before delivery reached this point is not a
		// new arrival. The comparison includes the boundary, as mail which arrived in the same
		// instant as the last delivery is still guarded by the delivered identifiers.
		return this.receivedAt(message.receivedDateTime) >= this.receivedAt(deliverFrom);
	}

	/**
	 * Fetch a single message and parse it into an email.
	 * @param graph The Microsoft Graph client.
	 * @param messageId The identifier of the message to fetch.
	 * @param categories The Outlook categories on the message.
	 * @returns The parsed email, or undefined if the message carried no content.
	 * @internal
	 */
	private async fetchEmail(
		graph: Client,
		messageId: string,
		categories: string[] | undefined
	): Promise<IEmail | undefined> {
		const response = await graph
			.api(this.messageContentPath(messageId))
			.responseType(ResponseType.TEXT)
			.get();

		const raw = Coerce.string(response);
		if (!Is.stringValue(raw)) {
			return undefined;
		}

		return MailHelper.parseEmail(raw, Is.arrayValue(categories) ? categories : undefined);
	}

	/**
	 * Build the path which starts a folder's delta cursor.
	 * @param folderId The folder to monitor.
	 * @returns The Microsoft Graph path.
	 * @internal
	 */
	private deltaPath(folderId: string): string {
		const select = OutlookEmailConnector._DELTA_SELECT.join(",");

		return `${this.mailboxPath()}/mailFolders/${encodeURIComponent(folderId)}/messages/delta?$select=${select}&$top=${this._config.maxMessagesPerPoll}`;
	}

	/**
	 * Build the path which returns a message as its raw MIME content.
	 * @param messageId The identifier of the message to fetch.
	 * @returns The Microsoft Graph path.
	 * @internal
	 */
	private messageContentPath(messageId: string): string {
		return `${this.mailboxPath()}/messages/${encodeURIComponent(messageId)}/$value`;
	}

	/**
	 * Build the path of the mailbox being monitored.
	 * @returns The Microsoft Graph path.
	 * @internal
	 */
	private mailboxPath(): string {
		// The mailbox is always addressed by the configured address, for the delegated flow as
		// well, where the consent guard has already established that it is the signed in account.
		return `/users/${encodeURIComponent(this._config.emailAddress)}`;
	}

	/**
	 * Convert a receipt time to a timestamp for comparison.
	 * @param receivedDateTime The receipt time to convert.
	 * @returns The timestamp, or zero when there is no usable receipt time.
	 * @internal
	 */
	private receivedAt(receivedDateTime: string | undefined): number {
		const timestamp = Is.stringValue(receivedDateTime) ? Date.parse(receivedDateTime) : Number.NaN;

		return Number.isNaN(timestamp) ? 0 : timestamp;
	}

	/**
	 * Record a message as delivered, trimming the oldest identifiers and moving the receipt time
	 * delivery has reached on.
	 * @param state The connector state to update.
	 * @param message The delivered message.
	 * @internal
	 */
	private recordDelivered(state: IOutlookEmailConnectorState, message: IOutlookDeltaMessage): void {
		// Replace rather than mutate, the previous array is kept so the record can be wound back.
		const delivered = [...(state.deliveredMessageIds ?? []), message.id];
		state.deliveredMessageIds = delivered.slice(-this._config.maxDeliveredIdHistory);

		if (
			Is.stringValue(message.receivedDateTime) &&
			this.receivedAt(message.receivedDateTime) >= this.receivedAt(state.lastReceivedDateTime)
		) {
			state.lastReceivedDateTime = message.receivedDateTime;
		}
	}
}

// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@3sixty/api-core";
import type { IBaseRestClientConfig, INoContentResponse } from "@3sixty/api-models";
import { Coerce, Guards, NotSupportedError } from "@3sixty/core";
import type {
	IEmail,
	IMailStorageComponent,
	IMailStorageGetRequest,
	IMailStorageGetResponse,
	IMailStorageListRequest,
	IMailStorageListResponse,
	IMailStorageRemoveRequest,
	IStoredEmail
} from "@3sixty/mailbox-models";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * REST client proxy for IMailStorageComponent.
 */
export class MailStorageRestClient extends BaseRestClient implements IMailStorageComponent {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<MailStorageRestClient>();

	/**
	 * Create a new instance of MailStorageRestClient.
	 * @param config The configuration for the REST client.
	 * @param pathPrefix The optional path prefix.
	 */
	constructor(config: IBaseRestClientConfig, pathPrefix?: string) {
		super(MailStorageRestClient.CLASS_NAME, config, pathPrefix ?? "mailbox/mail");
	}

	/**
	 * Get the class name.
	 * @returns The class name.
	 */
	public className(): string {
		return MailStorageRestClient.CLASS_NAME;
	}

	/**
	 * Store an email received from a mailbox. Not supported over REST.
	 * @param mailboxId The identifier of the mailbox.
	 * @param email The email to store.
	 * @returns The identifier assigned to the stored email.
	 */
	public async store(mailboxId: string, email: IEmail): Promise<string> {
		throw new NotSupportedError(MailStorageRestClient.CLASS_NAME, "notSupported", {
			methodName: "store"
		});
	}

	/**
	 * Retrieve a stored email by its identifier.
	 * @param id The identifier of the stored email.
	 * @returns The stored email.
	 */
	public async get(id: string): Promise<IStoredEmail> {
		Guards.stringValue(MailStorageRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IMailStorageGetRequest, IMailStorageGetResponse>(
			"/:id",
			HttpMethod.GET,
			{
				pathParams: { id }
			}
		);

		return response.body;
	}

	/**
	 * Remove a stored email by its identifier.
	 * @param id The identifier of the stored email to remove.
	 * @returns A promise that resolves when the email has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(MailStorageRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IMailStorageRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id }
		});
	}

	/**
	 * Query stored emails received at or after a given epoch.
	 * @param sinceEpoch The ISO 8601 timestamp to filter emails received at or after.
	 * @param mailboxId An optional mailbox identifier to restrict results to.
	 * @param cursor An optional cursor for paginated results.
	 * @param limit An optional maximum number of results to return.
	 * @returns A page of stored emails and an optional cursor for the next page.
	 */
	public async query(
		sinceEpoch: string,
		mailboxId?: string,
		cursor?: string,
		limit?: number
	): Promise<{ emails: IStoredEmail[]; cursor?: string }> {
		Guards.stringValue(MailStorageRestClient.CLASS_NAME, nameof(sinceEpoch), sinceEpoch);

		const response = await this.fetch<IMailStorageListRequest, IMailStorageListResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					since: sinceEpoch,
					mailboxId,
					cursor,
					limit: Coerce.string(limit)
				}
			}
		);

		return response.body;
	}
}

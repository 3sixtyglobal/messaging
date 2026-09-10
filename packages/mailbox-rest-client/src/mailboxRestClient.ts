// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import {
	HttpHeaderHelper,
	type INoContentResponse,
	type IBaseRestClientConfig
} from "@twin.org/api-models";
import { Coerce, Guards, NotSupportedError } from "@twin.org/core";
import type {
	IMailbox,
	IMailboxComponent,
	IMailboxConfigField,
	IMailboxConnectorSchemaRequest,
	IMailboxConnectorSchemaResponse,
	IMailboxCreateRequest,
	IMailboxCreateResponse,
	IMailboxCreateResult,
	IMailboxGetRequest,
	IMailboxGetResponse,
	IMailboxListRequest,
	IMailboxListResponse,
	IMailboxRemoveRequest,
	IMailboxUpdateRequest,
	IMailboxUpdateResponse,
	IMailboxUpdateResult
} from "@twin.org/mailbox-models";
import { nameof } from "@twin.org/nameof";
import { HttpMethod } from "@twin.org/web";

/**
 * REST client proxy for IMailboxComponent.
 */
export class MailboxRestClient extends BaseRestClient implements IMailboxComponent {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<MailboxRestClient>();

	/**
	 * Create a new instance of MailboxRestClient.
	 * @param config The configuration for the REST client.
	 * @param pathPrefix The optional path prefix.
	 */
	constructor(config: IBaseRestClientConfig, pathPrefix?: string) {
		super(MailboxRestClient.CLASS_NAME, config, pathPrefix ?? "mailbox");
	}

	/**
	 * Get the class name.
	 * @returns The class name.
	 */
	public className(): string {
		return MailboxRestClient.CLASS_NAME;
	}

	/**
	 * Create a new mailbox.
	 * @param mailbox The mailbox configuration to create.
	 * @returns The identifier assigned to the new mailbox, with the URL to open when the mailbox
	 * must be authenticated before it can be polled.
	 */
	public async createMailbox(
		mailbox: Pick<IMailbox, "name" | "connectorType" | "config" | "enabled">
	): Promise<IMailboxCreateResult> {
		Guards.object<typeof mailbox>(MailboxRestClient.CLASS_NAME, nameof(mailbox), mailbox);
		Guards.stringValue(MailboxRestClient.CLASS_NAME, nameof(mailbox.name), mailbox.name);
		Guards.stringValue(
			MailboxRestClient.CLASS_NAME,
			nameof(mailbox.connectorType),
			mailbox.connectorType
		);

		const response = await this.fetch<IMailboxCreateRequest, IMailboxCreateResponse>(
			"/",
			HttpMethod.POST,
			{ body: mailbox }
		);

		return {
			id: HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`),
			authUrl: response.body?.authUrl
		};
	}

	/**
	 * Update an existing mailbox.
	 * @param mailbox The updated mailbox configuration.
	 * @returns The URL to open when the mailbox must be authenticated before it can be polled.
	 */
	public async updateMailbox(mailbox: IMailbox): Promise<IMailboxUpdateResult> {
		Guards.object<IMailbox>(MailboxRestClient.CLASS_NAME, nameof(mailbox), mailbox);
		Guards.stringValue(MailboxRestClient.CLASS_NAME, nameof(mailbox.id), mailbox.id);

		const response = await this.fetch<IMailboxUpdateRequest, IMailboxUpdateResponse>(
			"/:id",
			HttpMethod.PUT,
			{
				pathParams: { id: mailbox.id },
				body: mailbox
			}
		);

		return { authUrl: response.body?.authUrl };
	}

	/**
	 * Complete an authentication flow, correlating the callback to the pending mailbox.
	 * @param authPayload The data handed to the callback URI, carrying the correlating state.
	 * @returns A promise that resolves when the mailbox has been authenticated.
	 * @throws NotSupportedError the flow is completed by the provider redirecting the browser to
	 * the service's own callback route, which skips authentication for that reason.
	 */
	public async completeAuth(authPayload: unknown): Promise<void> {
		throw new NotSupportedError(MailboxRestClient.CLASS_NAME, "notSupported", {
			methodName: "completeAuth"
		});
	}

	/**
	 * Remove a mailbox and stop polling for it.
	 * @param id The identifier of the mailbox to remove.
	 * @returns A promise that resolves when the mailbox has been removed.
	 */
	public async removeMailbox(id: string): Promise<void> {
		Guards.stringValue(MailboxRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IMailboxRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id }
		});
	}

	/**
	 * Retrieve a mailbox by its identifier.
	 * @param id The identifier of the mailbox to retrieve.
	 * @returns The mailbox.
	 */
	public async getMailbox(id: string): Promise<IMailbox> {
		Guards.stringValue(MailboxRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IMailboxGetRequest, IMailboxGetResponse>(
			"/:id",
			HttpMethod.GET,
			{
				pathParams: { id }
			}
		);

		return response.body;
	}

	/**
	 * List all mailboxes with optional cursor-based pagination.
	 * @param cursor An optional cursor for paginated results.
	 * @param limit An optional maximum number of results to return.
	 * @returns A page of mailboxes and an optional cursor for the next page.
	 */
	public async listMailboxes(
		cursor?: string,
		limit?: number
	): Promise<{ mailboxes: IMailbox[]; cursor?: string }> {
		const response = await this.fetch<IMailboxListRequest, IMailboxListResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					limit: Coerce.string(limit),
					cursor
				}
			}
		);

		return response.body;
	}

	/**
	 * Get the configuration schema for a connector type.
	 * @param connectorType The connector type to get the schema for.
	 * @returns The configuration field definitions for the connector.
	 */
	public async getSchema(connectorType: string): Promise<IMailboxConfigField[]> {
		Guards.stringValue(MailboxRestClient.CLASS_NAME, nameof(connectorType), connectorType);

		const response = await this.fetch<
			IMailboxConnectorSchemaRequest,
			IMailboxConnectorSchemaResponse
		>("/connectors/:connectorType/schema", HttpMethod.GET, {
			pathParams: { connectorType }
		});

		return response.body;
	}
}

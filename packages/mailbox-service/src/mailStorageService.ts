// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformComponent } from "@3sixty/api-models";
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import {
	BaseError,
	ComponentFactory,
	Guards,
	Is,
	type IValidationFailure,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	Validation
} from "@3sixty/core";
import {
	ComparisonOperator,
	EntitySchemaHelper,
	LogicalOperator,
	SortDirection,
	type IComparatorGroup
} from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import type { IEmail, IMailStorageComponent, IStoredEmail } from "@3sixty/mailbox-models";
import { nameof, nameofKebabCase } from "@3sixty/nameof";
import { StoredEmail } from "./entities/storedEmail.js";
import type { IMailStorageServiceConstructorOptions } from "./models/IMailStorageServiceConstructorOptions.js";

/**
 * Service implementing durable email storage and querying.
 */
export class MailStorageService implements IMailStorageComponent {
	/**
	 * The class name.
	 */
	public static readonly CLASS_NAME: string = nameof<MailStorageService>();

	/**
	 * The identifier for the retention task.
	 * @internal
	 */
	private static readonly _RETENTION_TASK_ID: string = "mail-storage-retention";

	/**
	 * The entity storage connector for emails.
	 * @internal
	 */
	private readonly _storedEmailEntityStorage: IEntityStorageConnector<StoredEmail>;

	/**
	 * The task scheduler used for retention cleanup.
	 * @internal
	 */
	private readonly _taskScheduler: ITaskSchedulerComponent;

	/**
	 * The platform component used to fan the retention sweep out across all tenant partitions.
	 * @internal
	 */
	private readonly _platformComponent: IPlatformComponent;

	/**
	 * The optional logging component.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The number of minutes to retain emails.
	 * @internal
	 */
	private readonly _retentionMinutes: number;

	/**
	 * Create a new instance of MailStorageService.
	 * @param options The options for the service.
	 */
	constructor(options?: IMailStorageServiceConstructorOptions) {
		this._storedEmailEntityStorage = EntityStorageConnectorFactory.get(
			options?.storedEmailEntityStorageType ?? nameofKebabCase<StoredEmail>()
		);
		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options?.taskSchedulerComponentType ?? "task-scheduler"
		);
		this._platformComponent = ComponentFactory.get<IPlatformComponent>(
			options?.platformComponentType ?? "platform"
		);
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(options?.loggingComponentType);
		this._retentionMinutes = options?.config?.retentionMinutes ?? 1440;

		const validationErrors: IValidationFailure[] = [];
		Guards.integer(
			MailStorageService.CLASS_NAME,
			nameof(options?.config?.retentionMinutes),
			this._retentionMinutes
		);
		Validation.integer(
			nameof(options?.config?.retentionMinutes),
			this._retentionMinutes,
			validationErrors,
			undefined,
			{ minValue: 1 }
		);
		Validation.asValidationError(
			MailStorageService.CLASS_NAME,
			nameof(options?.config),
			validationErrors
		);
	}

	/**
	 * Get the class name.
	 * @returns The class name.
	 */
	public className(): string {
		return MailStorageService.CLASS_NAME;
	}

	/**
	 * Start the component and schedule retention cleanup when configured.
	 * @returns A promise that resolves when the component has started.
	 */
	public async start(): Promise<void> {
		await this._taskScheduler.addTask(
			MailStorageService._RETENTION_TASK_ID,
			[{ nextTriggerTime: Date.now(), intervalMinutes: Math.min(this._retentionMinutes, 30) }],
			async () => this.removeExpired()
		);
	}

	/**
	 * Stop the component and remove the retention cleanup task.
	 * @returns A promise that resolves when the component has stopped.
	 */
	public async stop(): Promise<void> {
		await this._taskScheduler.removeTask(MailStorageService._RETENTION_TASK_ID);
	}

	/**
	 * Store an email received from a mailbox.
	 * @param mailboxId The identifier of the mailbox that received the email.
	 * @param email The email to store.
	 * @returns The identifier assigned to the stored email.
	 */
	public async store(mailboxId: string, email: IEmail): Promise<string> {
		Guards.stringValue(MailStorageService.CLASS_NAME, nameof(mailboxId), mailboxId);
		Guards.object<IEmail>(MailStorageService.CLASS_NAME, nameof(email), email);

		const id = RandomHelper.generateUuidV7();
		const entry = new StoredEmail();

		entry.id = id;
		entry.mailboxId = mailboxId;
		entry.receivedAt = new Date(Date.now()).toISOString();
		entry.headers = email.headers;
		entry.messageId = email.messageId;
		entry.from = email.from;
		entry.sender = email.sender;
		entry.to = email.to;
		entry.cc = email.cc;
		entry.bcc = email.bcc;
		entry.replyTo = email.replyTo;
		entry.deliveredTo = email.deliveredTo;
		entry.returnPath = email.returnPath;
		entry.inReplyTo = email.inReplyTo;
		entry.references = email.references;
		entry.subject = email.subject;
		entry.date = email.date;
		entry.textContent = email.textContent;
		entry.htmlContent = email.htmlContent;
		entry.attachments = email.attachments;
		entry.flags = email.flags;

		const truncated = this.truncateBoundedProperties(entry);

		await this._storedEmailEntityStorage.set(entry);

		if (truncated.length > 0) {
			await this._logging?.log({
				level: "warn",
				source: MailStorageService.CLASS_NAME,
				ts: Date.now(),
				message: "emailPropertiesTruncated",
				data: { mailboxId, emailId: id, properties: truncated.join(", ") }
			});
		}

		return id;
	}

	/**
	 * Retrieve a stored email by its identifier.
	 * @param id The identifier of the stored email.
	 * @returns The stored email.
	 */
	public async get(id: string): Promise<IStoredEmail> {
		Guards.stringValue(MailStorageService.CLASS_NAME, nameof(id), id);

		const entry = await this._storedEmailEntityStorage.get(id);

		if (Is.empty(entry)) {
			throw new NotFoundError(MailStorageService.CLASS_NAME, "emailNotFound", id);
		}

		return this.entryToEmail(entry);
	}

	/**
	 * Remove a stored email by its identifier.
	 * @param id The identifier of the stored email to remove.
	 * @returns A promise that resolves when the email has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(MailStorageService.CLASS_NAME, nameof(id), id);

		const entry = await this._storedEmailEntityStorage.get(id);

		if (Is.empty(entry)) {
			throw new NotFoundError(MailStorageService.CLASS_NAME, "emailNotFound", id);
		}

		await this._storedEmailEntityStorage.remove(id);
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
		Guards.stringValue(MailStorageService.CLASS_NAME, nameof(sinceEpoch), sinceEpoch);

		const group: IComparatorGroup<StoredEmail> = {
			conditions: [
				{
					property: "receivedAt",
					comparison: ComparisonOperator.GreaterThanOrEqual,
					value: sinceEpoch
				}
			],
			logicalOperator: LogicalOperator.And
		};

		if (Is.stringValue(mailboxId)) {
			group.conditions.push({
				property: "mailboxId",
				comparison: ComparisonOperator.Equals,
				value: mailboxId
			});
		}

		const result = await this._storedEmailEntityStorage.query(
			group,
			[{ property: "receivedAt", sortDirection: SortDirection.Descending }],
			undefined,
			cursor,
			limit
		);

		return {
			emails: (result.entities as StoredEmail[]).map(e => this.entryToEmail(e)),
			cursor: result.cursor
		};
	}

	/**
	 * Remove all stored emails older than the configured retention period.
	 * The email storage is partitioned per tenant, so the sweep runs for each partition instead
	 * of only the one which happens to be in context when the retention task fires.
	 * @internal
	 */
	private async removeExpired(): Promise<void> {
		await this._platformComponent.execute(async () => {
			await this.removeExpiredForPartition();
		});
	}

	/**
	 * Remove the stored emails older than the retention period from the current partition.
	 * @internal
	 */
	private async removeExpiredForPartition(): Promise<void> {
		try {
			const retentionMilliseconds = this._retentionMinutes * 60_000;
			const retentionThreshold = new Date(Date.now() - retentionMilliseconds).toISOString();
			const ids: string[] = [];
			let cursor: string | undefined;

			do {
				const result = await this._storedEmailEntityStorage.query(
					{
						conditions: [
							{
								property: "receivedAt",
								comparison: ComparisonOperator.LessThan,
								value: retentionThreshold
							}
						]
					},
					undefined,
					["id"],
					cursor
				);

				for (const entity of result.entities) {
					ids.push(entity.id as string);
				}

				cursor = result.cursor;
			} while (Is.stringValue(cursor));

			if (ids.length > 0) {
				await this._storedEmailEntityStorage.removeBatch(ids);
			}
		} catch (err) {
			await this._logging?.log({
				level: "error",
				source: MailStorageService.CLASS_NAME,
				ts: Date.now(),
				message: "retentionCleanupFailed",
				error: BaseError.fromError(err)
			});
		}
	}

	/**
	 * Truncate the string properties of an entry to the length its schema allows, so a header
	 * a remote sender overran cannot make the whole message impossible to store. The full text
	 * stays in the headers property, which has no bound.
	 * @param entry The entry to truncate the properties of, modified in place.
	 * @returns The names of the properties which were truncated.
	 * @internal
	 */
	private truncateBoundedProperties(entry: StoredEmail): string[] {
		const schema = EntitySchemaHelper.getSchema<StoredEmail>(StoredEmail);
		const truncated: string[] = [];

		for (const schemaProperty of schema.properties ?? []) {
			const value = entry[schemaProperty.property];

			// A format carries its own bound when no explicit maxLength is declared.
			const maxLength =
				schemaProperty.maxLength ??
				(Is.stringValue(schemaProperty.format)
					? EntitySchemaHelper.FORMAT_MAX_LENGTHS[schemaProperty.format]
					: undefined);

			if (
				Is.stringValue(value) &&
				Is.number(maxLength) &&
				maxLength > 0 &&
				value.length > maxLength
			) {
				ObjectHelper.propertySet(entry, schemaProperty.property, value.slice(0, maxLength));
				truncated.push(schemaProperty.property);
			}
		}

		return truncated;
	}

	/**
	 * Convert an email entry to a stored email.
	 * @param entry The email entry to convert.
	 * @returns The stored email.
	 * @internal
	 */
	private entryToEmail(entry: StoredEmail): IStoredEmail {
		return {
			id: entry.id,
			mailboxId: entry.mailboxId,
			receivedAt: entry.receivedAt,
			headers: entry.headers,
			messageId: entry.messageId,
			from: entry.from,
			sender: entry.sender,
			to: entry.to,
			cc: entry.cc,
			bcc: entry.bcc,
			replyTo: entry.replyTo,
			deliveredTo: entry.deliveredTo,
			returnPath: entry.returnPath,
			inReplyTo: entry.inReplyTo,
			references: entry.references,
			subject: entry.subject,
			date: entry.date,
			textContent: entry.textContent,
			htmlContent: entry.htmlContent,
			attachments: entry.attachments,
			flags: entry.flags
		};
	}
}

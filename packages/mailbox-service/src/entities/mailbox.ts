// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@3sixty/core";
import { entity, property } from "@3sixty/entity";

/**
 * Entity class representing a mailbox stored in entity storage.
 */
@entity()
export class Mailbox {
	/**
	 * The unique identifier for the mailbox.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The display name for the mailbox.
	 */
	@property({ type: "string", maxLength: 256 })
	public name!: string;

	/**
	 * The connector type identifying which connector handles this mailbox.
	 */
	@property({ type: "string", maxLength: 128 })
	public connectorType!: string;

	/**
	 * The connector-owned configuration for this mailbox.
	 */
	@property({ type: "object", optional: true })
	public config?: unknown;

	/**
	 * Whether this mailbox is active and should be polled.
	 */
	@property({ type: "boolean" })
	public enabled!: boolean;

	/**
	 * The connector-owned runtime state for this mailbox.
	 */
	@property({ type: "object", optional: true })
	public state?: unknown;

	/**
	 * Whether this mailbox is awaiting re-authentication.
	 */
	@property({ type: "boolean", optional: true })
	public requiresAuth?: boolean;

	/**
	 * Optional protocol-specific state produced during the auth flow, such as an OAuth URL or code.
	 */
	@property({ type: "object", optional: true })
	public authState?: unknown;

	/**
	 * The last error returned by the authentication callback.
	 */
	@property({ type: "object", optional: true })
	public authError?: IError;

	/**
	 * The last error returned by the retrieval callback.
	 */
	@property({ type: "object", optional: true })
	public retrievalError?: IError;

	/**
	 * The random value an external authentication flow carries alongside the mailbox
	 * identifier, which proves a callback belongs to a flow this mailbox started.
	 */
	@property({ type: "string", optional: true })
	public authNonce?: string;

	/**
	 * The node identifier captured at creation time.
	 */
	@property({ type: "string", maxLength: 255 })
	public nodeId!: string;

	/**
	 * The tenant identifier captured at creation time. Absent on single-tenant nodes.
	 */
	@property({ type: "string", maxLength: 32, optional: true })
	public tenantId?: string;

	/**
	 * The public origin captured at creation time, used to build the authentication callback URI.
	 * Captured here because polling can resume outside a request, where no origin is in context.
	 * Absent on a mailbox stored before an origin was recorded, which can still be polled with
	 * the credentials it holds but has nowhere for an authentication flow to return to.
	 */
	@property({ type: "string", format: "uri", optional: true })
	public publicOrigin?: string;
}

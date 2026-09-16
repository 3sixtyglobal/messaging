# Variable: GmailEmailConnectorStateSchema

> `const` **GmailEmailConnectorStateSchema**: `IMailboxConfigField`[]

The runtime state field schema for Gmail connectors.
The refresh token is issued by the consent flow rather than configured, so it travels in the
connector state and is marked secure to keep it in the vault.

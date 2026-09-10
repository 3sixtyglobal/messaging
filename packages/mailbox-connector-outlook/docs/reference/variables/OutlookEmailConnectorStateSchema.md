# Variable: OutlookEmailConnectorStateSchema

> `const` **OutlookEmailConnectorStateSchema**: `IMailboxConfigField`[]

The runtime state field schema for Outlook connectors.
The token cache is filled by the consent flow rather than configured, so it travels in the
connector state and is marked secure to keep the refresh token it holds in the vault.

# Variable: EmailProtocolConnectorStateSchemaFactory

> `const` **EmailProtocolConnectorStateSchemaFactory**: `Factory`\<[`IMailboxConfigField`](../interfaces/IMailboxConfigField.md)[]\>

Factory for retrieving email protocol connector state field definitions.
Only the properties a connector holds in its runtime state need registering here, and the ones
marked secure are stored in the vault instead of alongside the rest of the state.

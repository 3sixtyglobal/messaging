# Interface: IMailboxConfigField

Interface describing a single configuration field for a protocol connector.

## Properties

### labelKey {#labelkey}

> **labelKey**: `string`

The i18n key for the field label shown in the UI.

***

### propertyKey {#propertykey}

> **propertyKey**: `string`

The key of the property within the connector config object.

***

### type {#type}

> **type**: `EntitySchemaPropertyType`

The entity schema property type for this field.

***

### isSecure? {#issecure}

> `optional` **isSecure?**: `boolean`

Whether this field holds a sensitive value that should be stored in the vault.

***

### itemType? {#itemtype}

> `optional` **itemType?**: `EntitySchemaPropertyType`

The element type when `type` is `Array`.

***

### defaultValue? {#defaultvalue}

> `optional` **defaultValue?**: `unknown`

An optional default value for the field.

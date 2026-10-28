# Interface: IMessagingServiceConfig

Configuration for the messaging service.

## Properties

### inlineStyleSheets? {#inlinestylesheets}

> `optional` **inlineStyleSheets?**: `boolean`

Replace linked http and https style sheets in e-mail templates with inline style elements.

#### Default

```ts
true
```

***

### styleSheetCacheTtlMs? {#stylesheetcachettlms}

> `optional` **styleSheetCacheTtlMs?**: `number`

How long fetched style sheets are cached in milliseconds, 0 disables the cache.

#### Default

```ts
3600000
```

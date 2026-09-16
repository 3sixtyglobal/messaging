# Interface: IOutlookDeltaPage

A page of a Microsoft Graph delta cursor, carrying the link which continues or resumes it.

## Properties

### messages {#messages}

> **messages**: [`IOutlookDeltaMessage`](IOutlookDeltaMessage.md)[]

The messages the page reports as added or changed.

***

### nextLink? {#nextlink}

> `optional` **nextLink?**: `string`

The link to the next page, present while more of the current run remains.

***

### deltaLink? {#deltalink}

> `optional` **deltaLink?**: `string`

The link which resumes the cursor on a later poll, present on the final page of a run.

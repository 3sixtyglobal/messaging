# Interface: IImapEmailConnectorState

Top-level polling state for the IMAP connector, keyed by folder path.

## Properties

### folders? {#folders}

> `optional` **folders?**: `object`

Per-folder state, keyed by the folder path as configured.

#### Index Signature

\[`folderPath`: `string`\]: [`IImapEmailConnectorFolderState`](IImapEmailConnectorFolderState.md)

# Database Layer

The server interacts directly with the macOS iMessage database (`chat.db`) to provide high-performance message retrieval.

## Data Source

- **Path**: `~/Library/Messages/chat.db`
- **Format**: SQLite 3
- **Journal Mode**: WAL (Write-Ahead Logging)

## Implementation Details

The `MessageDatabase` class in `src/db.ts` handles all SQLite interactions:

1. **Read-Only Access**: To prevent interference with the system's Messages app, the database is opened in strictly read-only mode (`readonly: true`, `query_only = 1`).
2. **Resilient Opening**: Uses an exponential backoff retry mechanism to handle "Database is locked" errors that occur when Messages.app is writing to the DB.
3. **Timestamp Conversion**: Converts Apple's "Mac Absolute Time" (seconds since Jan 1, 2001) into standard ISO strings for LLM consumption.
4. **Context Enrichment**: Performs complex SQL joins across `message`, `handle`, `chat`, and `attachment` tables to provide a unified view of threads and media metadata.

## Key Queries

- **Recent Messages**: Fetches top N messages, including thread IDs (`reply_to_guid`) and service types (iMessage vs SMS).
- **Contact History**: Filters messages by contact handle (phone/email).
- **Attachment Mapping**: Resolves message-to-attachment relationships to provide file metadata and paths.

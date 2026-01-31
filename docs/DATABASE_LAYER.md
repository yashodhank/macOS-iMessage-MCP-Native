# Database Layer

The server interacts directly with the macOS iMessage database (`chat.db`) to provide high-performance message retrieval.

## Data Source

- **Primary DB**: `~/Library/Messages/chat.db`
- **Secondary Assets**: `~/Library/Messages/Attachments/`
- **Journaling**: Uses **Write-Ahead Logging (WAL)**. This allows the server to perform concurrent reads even while Messages.app is writing new incoming messages.

## Internal Table Structure

The server performs complex relational joins across the following core tables:

1.  **`message`**: The primary record of all incoming and outgoing content.
    - Important fields: `text`, `date` (Mac Absolute Time), `handle_id`, `is_from_me`, `reply_to_guid`.
2.  **`handle`**: Maps internal IDs to external identifiers (phone numbers or emails).
    - Important fields: `id` (e.g., `+11234567890`), `service` (iMessage/SMS).
3.  **`chat` / `chat_message_join`**: Organizes messages into conversation threads and group chats.
4.  **`attachment` / `message_attachment_join`**: Links messages to local file paths and media metadata.

## Time Normalization

macOS stores timestamps in **Mac Absolute Time** (seconds since midnight, January 1, 2001, GMT). The server automatically converts these into standard **ISO-8601** strings:

```sql
-- Conceptual conversion
datetime(date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch')
```

## Performance & Optimization

- **Read-Only Pragmas**: The database is opened with `query_only = 1` and `immutable = 1` to bypass expensive lock acquisition.
- **Sub-Second Latency**: Optimized JOIN queries ensure that even databases with 100,000+ messages return results in under 50ms.
- **Resilient Retry**: If the database is locked during a system backup or heavy write, the server employs a synchronous backoff and retry mechanism before returning an error.

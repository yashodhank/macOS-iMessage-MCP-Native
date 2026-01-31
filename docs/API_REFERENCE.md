# API Reference

This document details the tools and resources exposed by the iMessages MCP Server.

## Detailed Tool Specifications

### `send_message`
Sends an iMessage or SMS using the native Messages app.
- **Input Parameters**:
  - `recipient` (string): Phone number (international format) or email address.
  - `message` (string): The text content to send.
- **Returns**: A success confirmation or a detailed error with recommendations (e.g., TCC permission tips).

### `get_recent_messages`
Retrieves a flat timeline of the most recent messages across all threads.
- **Input Parameters**:
  - `limit` (number, default: 20): Maximum number of messages to return.
- **Returns**: A TOON-formatted list of message objects.

### `search_messages`
Performs a full-text search across the entire message database.
- **Input Parameters**:
  - `query` (string): The text search term.
  - `limit` (number, default: 20): Maximum number of matching messages.
- **Returns**: A TOON-formatted list of matching message objects.

### `get_contact_messages`
Retrieves the conversation history for a specific recipient.
- **Input Parameters**:
  - `handle` (string): The phone number or email of the contact.
  - `limit` (number, default: 20): Maximum history length.
- **Returns**: A TOON-formatted list of messages, ordered chronologically.

### `list_chats`
Enumerates all active chat sessions on the device.
- **Returns**: A list of chat objects including `chat_id`, `display_name`, and `last_message_date`.

### `search_contacts`
Finds recipient handles based on partial matches.
- **Input Parameters**:
  - `query` (string): Partial name, number, or email.
- **Returns**: A list of matching contact handles from the iMessage database.

### `get_attachment_path`
Resolves an attachment identifier to a physical file path.
- **Input Parameters**:
  - `guid` (string): The attachment GUID found in message metadata.
- **Returns**: The absolute file path on the local disk.

### `health_check`
Performs a self-diagnostic of the server environment.
- **Returns**: Status of Full Disk Access, Automation permissions, and database connectivity.

## Resource Specifications

### `imessage://recent`
- **Description**: Provides a real-time read of the 50 most recent messages.
- **Protocol**: Returns the data in **TOON v3.0** syntax.

## Data Interface Definitions

### Message Object Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `guid` | string | Unique identifier for the message. |
| `text` | string | Content of the message. |
| `sender` | string | Handle of the sender. |
| `date` | string | ISO-8601 timestamp. |
| `is_from_me` | boolean | `true` if outgoing, `false` if incoming. |
| `reply_to_guid` | string? | GUID of the parent message in a thread. |
| `is_read` | boolean | Read status of the message. |
| `service` | string | `iMessage` or `SMS`. |

# API Reference

This document details the tools and resources exposed by the iMessages MCP Server.

## Tools

### `send_message`
Sends an iMessage or SMS.
- **Arguments**:
  - `recipient` (string): Phone number or email.
  - `message` (string): Text content.

### `get_recent_messages`
Retrieves recent messages from the database.
- **Arguments**:
  - `limit` (number, default: 20): Number of messages to fetch.

### `search_messages`
Searches message text for a query.
- **Arguments**:
  - `query` (string): Text to search for.
  - `limit` (number, default: 20): Maximum results.

### `get_contact_messages`
Gets history with a specific contact.
- **Arguments**:
  - `handle` (string): Recipient identifier.
  - `limit` (number, default: 20): Maximum results.

### `list_chats`
Lists all active chat conversations.

### `search_contacts`
Searches for contact handles.
- **Arguments**:
  - `query` (string): Partial name or number.

### `get_attachment_path`
Gets the local path for an attachment.
- **Arguments**:
  - `guid` (string): The attachment GUID.

### `health_check`
Diagnoses permissions and system status.

## Resources

### `imessage://recent`
A dynamic resource providing a real-time JSON stream of the 50 most recent messages.
- **MimeType**: `text/toon; charset=utf-8`

## Data Interfaces

### Message Object (TOON)
```toon
guid:string
text:string
sender:string
date:ISO-String
is_from_me:boolean
reply_to_guid:string?
is_read:boolean
service:string (iMessage/SMS)
```

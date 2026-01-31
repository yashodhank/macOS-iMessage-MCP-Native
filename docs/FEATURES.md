# Core Features

The iMessages MCP Server provides a comprehensive suite of tools for iMessage interaction.

## 1. Message Retrieval
- **`get_recent_messages`**: Fetch the latest messages across all chats.
- **`get_contact_messages`**: Retrieve historical messages for a specific phone number or email.
- **Thread Awareness**: Messages include `reply_to_guid`, allowing the AI to reconstruct reply chains.
- **Read Status**: Real-time tracking of whether messages have been read.

## 2. Advanced Search
- **`search_messages`**: Perform full-text search across your entire iMessage history.
- **Performance**: Optimized SQL queries ensure fast results even with large (GB+) databases.

## 3. Native Messaging
- **`send_message`**: Send iMessages or SMS.
- **Handle Normalization**: Automatically converts formats like `(123) 456-7890` or `1234567890` into valid AppleScript identifiers.
- **Dual Fallback**: Attempts multiple methods to locate recipients, increasing success rates for new contacts.

## 4. Attachment Support
- **Metadata**: Messages include info about attached images, videos, or documents.
- **`get_attachment_path`**: Resolves attachment GUIDs to local file paths, enabling other tools to process files.

## 5. Contact Management
- **`list_chats`**: Get a bird's-eye view of all active conversations.
- **`search_contacts`**: Find the correct handle (phone/email) for a person by partial match.

## 6. TOON Optimization
All outputs are formatted using **TOON v3.0**, a token-efficient syntax that removes JSON redundancy, allowing the AI to "see" more history within its context window.

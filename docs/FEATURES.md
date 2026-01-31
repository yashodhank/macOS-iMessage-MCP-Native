# Core Features

The iMessages MCP Server provides a comprehensive suite of tools for iMessage interaction.

## 1. Message Retrieval
- **`get_recent_messages`**: Efficiently fetches the global timeline.
- **`get_contact_messages`**: Context-aware retrieval for specific handles.
- **Thread Awareness**: Every message includes its `reply_to_guid` (if applicable), allowing the AI to reconstruct complex branching conversations.
- **Service Detection**: Automatically distinguishes between **iMessage** and **SMS/MMS** messages.
- **Read Status Tracking**: Includes `is_read` flag for monitoring conversation progress.

## 2. Advanced Search
- **Full-Text Search (FTS)**: Utilizes SQLite's underlying engine to search millions of messages in milliseconds.
- **Result Normalization**: Consolidates results from disparate tables into a unified, AI-ready structure.

## 3. Native Messaging & Recovery
- **`send_message`**: Dispatches via the native Apple ecosystem.
- **Smart Retries**: If the Messages app is busy, the server employs an **Exponential Backoff** strategy to ensure delivery.
- **Self-Healing**: If the Messaging service is detected as offline or unresponsive, the server initiates an automatic recovery and re-launch sequence.

## 4. Attachment & Media Support
- **`get_attachment_path`**: Converts opaque database GUIDs into absolute local file system paths (e.g., `/Users/me/Library/Messages/Attachments/...`).
- **Media Metadata**: Provides file type, filename, and size information to the AI, enabling it to know when an image or document was sent.

## 5. Contact & Chat Discovery
- **`list_chats`**: Provides a high-level summary of all active conversations, including group chat titles and participant counts.
- **Handle Normalization**: Automatically converts various input formats (e.g., `(123) 456-7890`, `+11234567890`) into the canonical format required by macOS.

## 6. TOON v3.0 Optimization
To maximize the AI's context window, all data is serialized using the **Token-Oriented Object Notation**.
- **Header-Prefixed Arrays**: Groups related data under a single type definition.
- **Redundancy Stripping**: Removes repeated JSON keys, allowing for up to **50% more history** in a single context window compared to standard MCP servers.

# User's Manual: iMessages MCP Server

Welcome to the definitive guide for the **Native macOS iMessage MCP Server**. This document provides a high-level walkthrough of how to use and optimize your experience with the server.

## 📖 Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Using the Tools](#using-the-tools)
4. [Understanding TOON Format](#toon-format)
5. [Diagnostics & Troubleshooting](#troubleshooting)
6. [Support & Contributions](#support)

## 1. Overview
The iMessages MCP Server allows AI agents (like Claude Desktop) to securely interact with your local iMessage database. It is designed for **privacy**, **native performance**, and **token efficiency**.

- [Full Project Overview](./docs/OVERVIEW.md)

## 2. Quick Start
If you haven't installed the server yet, follow our [Getting Started Guide](./docs/GETTING_STARTED.md).

**Pro Tip**: Always ensure you have granted **Full Disk Access** to the terminal or app running this server.

## 3. Using the Tools
The server exposes several tools to your AI agent. Here is how you can interact with them:

### ✉️ Sending Messages
**Tool**: `send_message`
- **Example**: *"Send a message to +1234567890 saying 'I'll be there in 5 minutes!'"*
- **What happens**: The AI calls the tool, which executes an AppleScript to send the message. You'll see the message appear in your Messages app.

### 🔍 Searching History
**Tool**: `search_messages`
- **Example**: *"Find any messages where I discussed 'flight tickets'."*
- **What happens**: The server queries your local `chat.db` and returns a list of matching messages in efficient TOON format.

### 🕒 Reading Recent Conversations
**Tool**: `get_recent_messages`
- **Example**: *"What are my 5 most recent messages?"*
- **What happens**: Returns the latest messages across all your chats, including who sent them and when.

### 📁 Accessing Attachments
**Tool**: `get_attachment_path`
- **Example**: *"Find the file path for the last photo John sent me."* (The AI will first find the message, get the attachment GUID, then call this tool).
- **What happens**: Resolves the GUID to a local path like `/Users/YOU/Library/Messages/Attachments/...`.

---

## 4. Practical Usage Scenarios

| Scenario | AI Prompt | Recommended Tool |
| :--- | :--- | :--- |
| **Recapping** | "What did Mike say about the meeting earlier today?" | `get_contact_messages` |
| **Planning** | "Find all messages from last week about 'vacation' and summarize our ideas." | `search_messages` |
| **Coordinating** | "Message my wife that I'm leaving work now." | `send_message` |
| **Maintenance** | "Check if my permissions are set up correctly." | `health_check` |

---

## 5. Understanding TOON Format
This server uses the **TOON v3.0** format for efficiency. Your AI agent will receive data in a compact, tabular style that saves tokens and increases speed. No configuration is needed; it's handled automatically.

## 5. Diagnostics & Troubleshooting
If you encounter errors like `Database unavailable` or `Error -1743`, run the **`health_check`** tool. It will provide a detailed report and actionable steps to fix permission issues.

- [Comprehensive Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

## 6. Support & Contributions
- **Fuel the Project**: [Buy Me a Coffee](https://buymeacoffee.com/securiace)
- **Get Involved**: Check out [CONTRIBUTORS.md](./CONTRIBUTORS.md)

---
*Technical Deep Dives*:
- [MCP Protocol Implementation](./docs/MCP_PROTOCOL.md)
- [Database & SQLite Internals](./docs/DATABASE_LAYER.md)
- [AppleScript Messaging Logic](./docs/APPLESCRIPT_INTEGRATION.md)
- [Binary & Docker Deployment](./docs/CONFIGURATION_DEPLOYMENT.md)
- [System Architecture](./docs/ARCHITECTURE.md)

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
The server exposes several tools to your AI agent:
- **`send_message`**: Ask the AI to "Send a message to John saying Hello".
- **`get_recent_messages`**: Ask "What are my latest messages?".
- **`search_messages`**: Ask "Find all messages about the dinner party".
- **`list_chats`**: Ask "Who have I been talking to lately?".

- [Detailed API Reference](./docs/API_REFERENCE.md)
- [Feature Walkthrough](./docs/FEATURES.md)

## 4. TOON Format
This server uses the **TOON v3.0** format for efficiency. Your AI agent will receive data in a compact, tabular style that saves tokens and increases speed. No configuration is needed; it's handled automatically.

## 5. Diagnostics & Troubleshooting
If you encounter errors like `Database unavailable` or `Error -1743`, run the **`health_check`** tool. It will provide a detailed report and actionable steps to fix permission issues.

- [Comprehensive Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

## 6. Support & Contributions
- **Fuel the Project**: [Buy Me a Coffee](https://buymeacoffee.com/securiace)
- **Get Involved**: Check out [CONTRIBUTORS.md](./CONTRIBUTORS.md)

---
*For technical details, see the [Architecture Document](./docs/ARCHITECTURE.md).*

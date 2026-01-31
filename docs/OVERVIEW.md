# Project Overview

The **iMessages MCP Server** is a native macOS implementation of the Model Context Protocol (MCP). It acts as a secure bridge between Large Language Models (LLMs) and your local iMessage database, allowing AI agents to:

- **Read & Analyze**: Access recent messages and conversation threads.
- **Search**: Query your entire iMessage history using text searches.
- **Send**: Send new iMessages or SMS directly via Apple's native Messages app.
- **Context Awareness**: Understand message threads, attachments, and delivery status.

## Why Native?

Unlike protocol-level reverse engineering projects, this server uses **direct database access** and **AppleScript**, ensuring high reliability, security, and compatibility with the latest macOS updates. It respects Apple's security sandbox by utilizing standard TCC permissions (Full Disk Access and Automation).

## TOON Integration

Optimized for LLMs, the server uses **TOON (Token-Oriented Object Notation)** to minimize token consumption by up to 50% compared to standard JSON, making it faster and more cost-effective for AI interactions.

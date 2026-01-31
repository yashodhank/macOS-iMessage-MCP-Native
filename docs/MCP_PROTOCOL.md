# MCP Protocol Implementation

The iMessages MCP Server implements the **Model Context Protocol (MCP)** to provide a standardized interface for LLMs.

## Server Capabilities

The server is built using the `@modelcontextprotocol/sdk` and supports the following capabilities:

- **Tools**: Executable functions that allow the LLM to perform actions (sending messages) or retrieve specific data (searching messages).
- **Resources**: Dynamic data entities that the LLM can "read" to get a snapshot of state (e.g., the `imessage://recent` feed).

## Transport Layer

The server uses **JSON-RPC 2.0** over **Standard Input/Output (stdio)**. This allows it to be easily integrated into local MCP clients like Claude Desktop, Cursor, or VS Code.

## Tool Definitions

Every tool is defined with a **Zod-validated input schema**. This ensures that the LLM provides the correct arguments (e.g., valid strings for phone numbers) before any logic is executed.

## Resource URIs

The server exposes resources using custom URI schemes:
- `imessage://recent`: Returns a TOON-formatted list of the 50 most recent messages.

## Error Handling

The implementation maps native macOS errors (e.g., AppleScript timeouts or SQLite locks) to standard **MCP Error Codes**:
- `InternalError`: For database access failures.
- `InvalidParams`: For schema validation failures.
- `MethodNotFound`: For unknown tool calls.

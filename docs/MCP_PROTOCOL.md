# MCP Protocol Implementation

The iMessages MCP Server implements the **Model Context Protocol (MCP)** to provide a standardized interface for LLMs.

## Server Capabilities

The server advertises the following capabilities during the `initialize` handshake:

- **Tools**: Dynamic functions with structured input schemas. 
  - All tools use **Zod** for runtime validation, ensuring that malformed LLM requests are rejected before execution.
- **Resources**: State-based data entities accessible via custom URIs.
  - Resources support **TOON** content types for high-efficiency reading.

## Transport & Handshake

The server utilizes the standard MCP **Stdio Transport**:

1.  **Connection**: The client (e.g., Claude Desktop) spawns the server process and connects via standard pipes.
2.  **Initialization**: 
    - Client sends `initialize` request.
    - Server responds with name (`imessage-mcp`), version, and capabilities.
    - Handshake concludes with `initialized` notification.
3.  **Tool Discovery**: Client calls `list_tools` to discover available functions and their JSON schemas.

## Custom Resource URIs

Resources are addressed using the `imessage://` scheme:
- `imessage://recent`: A dynamic stream of the 50 most recent messages, returned in `text/toon` format.

## Error Handling & Mapping

The server provides granular error reporting by mapping native exceptions to MCP codes:

| Native Source | MCP Error Code | Description |
| :--- | :--- | :--- |
| Zod Validation | `InvalidParams` (-32602) | Incorrect tool arguments provided by LLM. |
| SQLite Lock | `InternalError` (-32603) | Database currently inaccessible (retry recommended). |
| AppleScript TCC | `InternalError` (-32603) | Permissions missing for Messages.app automation. |
| Unknown Tool | `MethodNotFound` (-32601) | LLM attempted to call a non-existent tool. |

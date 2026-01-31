# Architecture & Design

The iMessages MCP Server is built with a modular, service-oriented architecture designed for reliability and security on macOS.

## System Architecture

The server consists of several core layers:

1. **MCP Transport Layer**: Handles communication with the MCP client (e.g., Claude Desktop) via Standard Input/Output (stdio).
2. **Service Layer**: Orchestrates logic between the MCP protocol and macOS-specific operations.
3. **Database Abstraction Layer (`db.ts`)**: Provides read-only access to the SQLite `chat.db`. It handles complex joins for attachments and thread resolution.
4. **AppleScript Engine (`applescript.ts`)**: Manages inter-process communication with the native Messages.app for sending content.
5. **Permissions Guardian (`permissions.ts`)**: Performs empirical tests to verify TCC permission status and system health.

## Key Design Patterns

- **Read-Only Database**: The server opens `chat.db` in `immutable` / `query_only` mode to prevent database corruption and minimize locking conflicts with the Messages app.
- **Exponential Backoff**: Implements a synchronous retry mechanism for database locks, ensuring stability when the Messages app is actively writing.
- **Normalization**: Automatically cleans and formats phone numbers and identifiers before processing, reducing delivery failures.
- **Token Efficiency**: Custom TOON encoder serializes data into a tabular format, significantly reducing the token footprint for AI agents.

## Data Flow

```mermaid
graph TD
    Client[MCP Client] <--> Server[MCP Server]
    Server --> DB[(chat.db)]
    Server --> AS[AppleScript]
    AS --> Messages[Messages.app]
    DB --> Attachments[Local File System]
```

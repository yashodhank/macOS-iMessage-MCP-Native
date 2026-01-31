# Configuration & Deployment

The iMessages MCP Server is designed for flexible deployment across various macOS environments.

## Environment Variables

The server behavior can be tuned using the following variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `CHAT_DB_PATH` | Absolute path to the iMessage SQLite database. | `~/Library/Messages/chat.db` |
| `DEBUG` | Enables verbose SQL and AppleScript logging. | `false` |
| `TERM_PROGRAM` | Automatically detected to provide context-aware help. | - |

## Deployment Methods

### 1. Single Binary (Recommended for non-devs)
Bundles the Node.js runtime and all dependencies into a single executable.
- **Build**: `npm run build:binary`
- **Output**: `bin/imessage-mcp-arm64` (or x64)
- **Security**: The binary must be granted **Full Disk Access** and **Automation** permissions separately from your terminal.

### 2. Docker (Recommended for Isolation)
Ideal for running the server in a containerized environment while mounting the host's database.

**Volume Mapping**:
```yaml
volumes:
  - ~/Library/Messages:/data/messages:ro
environment:
  - CHAT_DB_PATH=/data/messages/chat.db
```
- **Note**: You must grant **Full Disk Access** to the Docker Desktop application on your Mac.

### 3. Manual Source (Recommended for Devs)
Run directly from source code for hot-reloading and debugging.
- **Setup**: `npm install && npm run build`
- **Execution**: `npm start`
- **Dev Mode**: `npm run dev`

## macOS Entitlements & Signing

The server requires specific entitlements to access protected system resources when packaged as a binary:
- `com.apple.security.automation.apple-events`: Required for AppleScript IPC.
- `com.apple.security.files.user-selected.read-only`: Facilitates database access.

Binary generation is handled via `pkg` with a custom `sea-config.json` for single-executable application (SEA) support in modern Node.js versions.

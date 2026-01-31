# Getting Started

Follow these steps to get your iMessages MCP server up and running.

## Prerequisites

- **OS**: macOS 11.0 (Big Sur) or higher.
- **Runtime**: Node.js 18.x or higher.
- **Hardware**: Compatible with both Intel and Apple Silicon (M1/M2/M3).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yashodhank/macOS-iMessage-MCP-Native.git
   cd macOS-iMessage-MCP-Native
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Granting Permissions

To function correctly, the server requires two macOS permissions:

1. **Full Disk Access**: Required to read `~/Library/Messages/chat.db`.
   - Go to `System Settings` > `Privacy & Security` > `Full Disk Access`.
   - Add and enable your Terminal (e.g., Terminal.app, iTerm2) or IDE (Cursor, VS Code).

2. **Automation**: Required to send messages.
   - Go to `System Settings` > `Privacy & Security` > `Automation`.
   - Ensure your Terminal/IDE is allowed to control `Messages`.

## Running the Server

Start the server using:
```bash
npm start
```

For development with hot-reload:
```bash
npm run dev
```

## Health Check

Once running, you can verify your setup using the `health_check` tool within your MCP client. It will diagnose any missing permissions or environment issues.

## Detailed Configuration Guide

### 1. Finding your Node.js path
MCP clients usually need the absolute path to the `node` executable.
```bash
which node
# Output: /usr/local/bin/node (Example)
```

### 2. Setting up with Claude Desktop
Claude Desktop looks for a configuration file at `~/Library/Application Support/Claude/claude_desktop_config.json`.

**Recommended Configuration:**
```json
{
  "mcpServers": {
    "imessage": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/YOUR_USER/path/to/imessage-mcp/dist/index.js"],
      "env": {
        "CHAT_DB_PATH": "/Users/YOUR_USER/Library/Messages/chat.db"
      }
    }
  }
}
```

### 3. Permission Deep-Dive
If `health_check` reports issues even after granting permissions:
- **Terminal Integration**: Ensure the terminal you used to build/test the server has FDA.
- **IDE Sandboxing**: Some IDEs (like Cursor) run in a sandbox that may not inherit FDA from the terminal. You must explicitly add the IDE application to the FDA list.
- **Full Disk Access (FDA)**: This is the most common failure point. Mac security requires that the *parent process* (the app that launches the server) has FDA.

## Next Steps
- Read the [User's Manual](../USERS_MANUAL.md) for practical examples.
- Explore the [API Reference](./API_REFERENCE.md) for a list of all available tools.

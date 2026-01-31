# iMessages MCP Server

A Model Context Protocol (MCP) server for interacting with macOS iMessages. This server allows LLMs to read, search, and send iMessages directly from your Mac.

## Features

- **Read Messages**: Get recent messages from any contact or chat.
- **Search**: Search through your entire iMessage history.
- **Send Messages**: Send iMessages using AppleScript.
- **Health Check**: Built-in diagnostics for permissions (Full Disk Access & Automation).
- **Contact Integration**: Find chats by contact name or handle.
- **TOON Format**: Upgraded output using Token-Oriented Object Notation for token efficiency.

## TOON Format Output

This server has been upgraded to use the **TOON (Token-Oriented Object Notation) v3.0** format for all tool outputs and resources. This format is designed for maximum token efficiency in Large Language Model (LLM) communications, reducing token overhead by up to 50% compared to standard JSON.

- **Media Type**: `text/toon; charset=utf-8`
- **Specification**: [TOON v3.0](https://toonformat.dev/reference/spec.html)

All tabular data (messages, chats, contacts) is returned in TOON's efficient tabular format.

## Deployment Methods

### 1. Single Binary (MacOS) - Recommended for ease of use
We provide a pre-built single binary for macOS (Intel & Apple Silicon).

**Build your own:**
```bash
npm run build:binary
```
The binary will be generated in the `bin/` directory.

### 2. Docker (Containerized)
Ideal for isolated environments. Note that you must grant Full Disk Access to Docker Desktop.

```bash
docker-compose up -d
```

### 3. Manual (Node.js)
```bash
npm install
npm run build
npm start
```

## Permissions Requirements

This server requires two main permissions on macOS:

1.  **Full Disk Access**: Required to read the iMessage database located at `~/Library/Messages/chat.db`.
    - Go to `System Settings` -> `Privacy & Security` -> `Full Disk Access`.
    - Add your Terminal (e.g., Terminal, iTerm2), the IDE (e.g., Cursor, VS Code), or the **generated binary**.
2.  **Automation**: Required to send messages via the Messages app.
    - Go to `System Settings` -> `Privacy & Security` -> `Automation`.
    - Ensure your Terminal/IDE/Binary has permission to control `Messages`.

## Troubleshooting

### Binary Execution Issues
If the binary fails to run with a "Permission Denied" or "Aborted" error:
1. Ensure you have run `chmod +x bin/imessage-mcp-arm64`.
2. Check if the binary is signed: `codesign -vvv bin/imessage-mcp-arm64`.
3. If using the binary directly in an MCP client (like Claude Desktop), ensure the full path is specified.

### Native Module Mismatch
The binary build uses `pkg` which may sometimes have issues with native modules if the Node.js version of the host doesn't match the target. If you see `NODE_MODULE_VERSION` errors, it is recommended to use the **Docker** or **Manual** deployment methods.

## Configuration

- `CHAT_DB_PATH`: (Optional) Custom path to `chat.db`. Defaults to the standard macOS path.

## Development

- `npm run dev`: Start with hot-reload using `tsx`.
- `npm test`: Run unit tests with `vitest`.

## Supporting the Project

This bridge between your Mac and the AI world is built and maintained with passion. If this tool saves you hours of manual messaging or enables a breakthrough in your AI workflow, consider fueling its development. 

Your support ensures we can keep up with macOS updates, maintain security patches, and continue adding high-value features like TOON optimization.

- ☕ **One-time Support**: [Buy Me a Coffee](https://buymeacoffee.com/securiace)
- 🚀 **Membership**: Join the circle of supporters for prioritized feature requests and direct implementation support.

## Contributors

We welcome contributions from the community! Whether it's a bug fix, a new feature, or improved documentation, your help is invaluable.

- **Lead Developer**: [Securiace](https://github.com/securiace)
- **Community**: Join us in the discussions and help shape the future of native iMessage MCP!

## License

ISC

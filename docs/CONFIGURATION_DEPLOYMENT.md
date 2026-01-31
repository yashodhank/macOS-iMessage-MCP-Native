# Configuration & Deployment

The iMessages MCP Server is designed for flexible deployment across various macOS environments.

## Environment Variables

- `CHAT_DB_PATH`: Override the default location of the iMessage database. Useful for testing or when using a backed-up DB.
- `TERM_PROGRAM`: Automatically detected to provide environment-specific permission advice (e.g., identifying when running in Cursor or VS Code).

## Deployment Methods

### 1. Single Binary
Ideal for non-developers.
- Uses `pkg` to bundle the Node.js runtime and assets into a single executable.
- Requires `codesign` with specific entitlements (`entitlements.plist`) to access protected files.

### 2. Docker
Ideal for isolation.
- Mounts the host's `~/Library/Messages` folder as a volume.
- **Note**: Full Disk Access must be granted to the Docker application on the host Mac.

### 3. Manual Source
Best for developers.
- Requires Node.js 18+ and `npm install`.
- Run using `npm start` or `npm run dev`.

## Build Infrastructure

The `scripts/build.sh` script automates the generation of binaries for both **Intel** and **Apple Silicon** architectures. It ensures that the correct permissions are bundled and that the binary is ready for distribution.

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

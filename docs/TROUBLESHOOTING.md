# Troubleshooting & FAQ

Common issues and their resolutions for the iMessages MCP Server.

## 1. Full Disk Access (FDA) Issues
**Symptoms**: `Database unavailable` error or `Operation not permitted`.
- **Cause**: macOS restricts access to the `Library/Messages` folder.
- **Verification**: Run the `health_check` tool. If "FDA Status" is `denied`, the server cannot read your messages.
- **Fix**: 
  1. Open **System Settings** > **Privacy & Security** > **Full Disk Access**.
  2. Add and toggle **ON** the specific binary or app running the server (e.g., Cursor, Terminal, or `imessage-mcp`).
  3. **Note**: If running through an IDE, you may need to add the IDE itself, as permissions are often not inherited.

## 2. Automation & AppleScript Errors
**Symptoms**: `Error -1743` or `Not authorized to send Apple events`.
- **Cause**: Missing permission to control Messages.app.
- **Fix**: 
  1. Open **System Settings** > **Privacy & Security** > **Automation**.
  2. Ensure the entry for your Terminal/IDE has **Messages** enabled.

## 3. Database Locking (`SQLITE_BUSY`)
**Symptoms**: `database is locked` error.
- **Cause**: Messages.app is writing to the database (e.g., during a sync).
- **Resolution**: The server automatically retries 3 times with exponential backoff. If the error persists, try closing Messages.app for a moment.

## 4. Specific Error Code Meanings

| Code | Meaning | Resolution |
| :--- | :--- | :--- |
| `-1728` | Recipient Not Found | Check the phone/email format. Use `search_contacts`. |
| `-600` | App Not Running | The server will attempt to auto-launch Messages.app. |
| `-1712` | Timeout | System is busy. Retry the command. |
| `1` | SQL Error | Custom `CHAT_DB_PATH` may be incorrect. |

## 5. IDE Sandboxing
**Symptoms**: Fails in VS Code/Cursor terminal but works in native macOS Terminal.
- **Cause**: Some IDEs run in a restricted sandbox.
- **Fix**: Grant FDA directly to the IDE application or use a native terminal.

---

### FAQ

**Q: Does this work with SMS?**
A: Yes, as long as "Text Message Forwarding" is enabled on your iPhone and your Mac is receiving them.

**Q: Can it send attachments?**
A: Currently, the server supports *reading* attachment metadata and paths. Sending attachments is a planned feature for a future update.

**Q: Why is my message output formatted strangely?**
A: The server uses **TOON v3.0**, a token-efficient tabular format. Most modern LLM clients (like Claude 3.5 Sonnet) understand this format natively and will present it correctly to you.

**Q: How do I enable debug logging?**
A: Start the server with the environment variable `DEBUG=true`.

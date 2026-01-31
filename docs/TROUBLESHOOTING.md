# Troubleshooting & FAQ

Common issues and their resolutions for the iMessages MCP Server.

## 1. Full Disk Access Issues
**Symptoms**: `Database unavailable` error or `Operation not permitted`.
- **Cause**: macOS restricts access to the `Library/Messages` folder by default.
- **Fix**: 
  1. Open **System Settings** > **Privacy & Security** > **Full Disk Access**.
  2. Ensure your Terminal app AND your IDE (Cursor/VS Code) are toggled ON.
  3. **Restart** your terminal/IDE after making changes.

## 2. Automation / AppleScript Errors
**Symptoms**: `Error -1743` when sending a message.
- **Cause**: The application doesn't have permission to control Messages.app.
- **Fix**: 
  1. Open **System Settings** > **Privacy & Security** > **Automation**.
  2. Locate your Terminal/IDE and ensure the **Messages** toggle is enabled.

## 3. Database is Locked
**Symptoms**: `database is locked` error in logs.
- **Cause**: The Messages.app is currently performing a write operation.
- **Fix**: The server includes built-in retry logic. If it persists, try closing the Messages app temporarily.

## 4. Recipient Not Found
**Symptoms**: `Error -1728` when sending.
- **Cause**: The phone number format is unrecognized or the contact doesn't exist.
- **Fix**: Use the full international format (e.g., `+11234567890`) or use the `search_contacts` tool to verify the handle.

## 5. IDE Sandbox Issues
**Symptoms**: Works in native Terminal but fails in VS Code/Cursor.
- **Cause**: IDEs sometimes run in a restricted sandbox that doesn't inherit FDA permissions correctly.
- **Fix**: Launch the server from a native macOS Terminal window instead of the integrated IDE terminal.

---

### FAQ

**Q: Does this work with SMS?**
A: Yes, if your Mac is configured to forward SMS from your iPhone, this server can read and send them.

**Q: Is my data safe?**
A: Yes. The server runs entirely locally. Your messages never leave your machine except when sent to your local LLM client.

# AppleScript Integration

Sending messages on macOS requires interacting with the native **Messages.app**. The server uses AppleScript to achieve this securely.

## Workflow

1. **Normalization**: The `AppleScriptService` first cleans the recipient handle (stripping non-numeric characters for phone numbers while preserving email formats).
2. **Escaping**: Message content is sanitized to escape quotes, backslashes, and newlines to prevent AppleScript injection or syntax errors.
3. **Script Execution**: The server generates a dynamic AppleScript that:
   - Activates the `iMessage` service.
   - Locates the `buddy` or `participant` by the provided handle.
   - Sends the message string.
4. **Fallback Logic**: If the first attempt fails (e.g., the contact is new), the script tries a fallback method to locate the recipient before returning an error.

## Permission Mapping

AppleScript execution is governed by macOS **Automation** permissions. The server maps common AppleScript error codes to human-readable recommendations:
- `-1743`: Automation permission denied (TCC).
- `-1728`: Recipient not found.
- `-600`: Messages.app is not running.

## Security

By using AppleScript instead of protocol-level hacking, the server remains compliant with macOS security policies and ensures that messages are sent through your official Apple ID identity.

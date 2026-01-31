# AppleScript Integration

Sending messages on macOS requires interacting with the native **Messages.app**. The server uses AppleScript to achieve this securely.

## Execution Workflow

1.  **Recipient Normalization**: The server cleans input handles. For example, `(555) 123-4567` is normalized to `+15551234567`. Emails are preserved as-is.
2.  **Safety Escaping**: Content is sanitized to prevent AppleScript injection attacks. Quotes, backslashes, and special characters are escaped using a multi-pass regex.
3.  **Dynamic Script Generation**: A tailored AppleScript is generated for each request.
4.  **Dual-Method Dispatch**:
    - **Method A (`participant`)**: Attempts to find an existing account-linked participant. This is the fastest and most reliable method for active threads.
    - **Method B (`buddy`)**: If Method A fails, the server falls back to locating a global "buddy." This ensures that messages can be sent to new contacts who haven't been messaged from this Mac before.

## Resiliency & Retries

The AppleScript implementation features a **Fallback Orchestrator**:
- **Automatic Discovery**: The server checks if `Messages.app` is running and launches it if necessary.
- **Retry Mechanism**: Implements 3 attempts with **Exponential Backoff** (1s, 2s, 4s delays) to handle transient AppleScript execution errors (e.g., `-1712` timeout).

## Error Mapping & Recommendations

Native AppleScript errors are mapped to user-friendly advice:

| Error Code | Meaning | Recommendation |
| :--- | :--- | :--- |
| `-1743` | TCC Access Denied | Grant **Automation** permissions in System Settings. |
| `-1728` | Recipient Not Found | Verify the phone number format or email address. |
| `-600` | Process Not Running | The server will attempt to auto-launch Messages.app. |
| `-1712` | Timeout | System is under heavy load; retry logic will automatically handle this. |

## Security & Compliance

By utilizing AppleScript, the server operates within the official macOS automation sandbox. This approach ensures:
- **No Private Keys**: Unlike protocol-level implementations, this server never handles your encryption keys or Apple ID passwords.
- **Identity Integrity**: Messages are sent directly through your authenticated Apple ID, preserving read receipts and cross-device syncing.

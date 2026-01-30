import { runAppleScript } from 'run-applescript';

export interface SendMessageResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  recommendation?: string;
}

export class AppleScriptService {
  /**
   * Sends an iMessage to a recipient with improved error handling.
   * @param recipient The phone number or email address of the recipient.
   * @param message The message text to send.
   */
  async sendMessage(recipient: string, message: string): Promise<SendMessageResult> {
    // Escape special characters for AppleScript
    const escapedMessage = message
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    
    const escapedRecipient = recipient.replace(/"/g, '\\"');
    
    // More robust AppleScript with better error handling
    const script = `
      tell application "Messages"
        try
          -- Try to find existing chat or create new one
          set targetService to 1st account whose service type = iMessage
          set targetBuddy to participant "${escapedRecipient}" of targetService
          send "${escapedMessage}" to targetBuddy
          return "success"
        on error errMsg number errNum
          -- Fallback: try using buddy directly
          try
            set targetBuddy to buddy "${escapedRecipient}"
            send "${escapedMessage}" to targetBuddy
            return "success"
          on error errMsg2 number errNum2
            return "error:" & errNum2 & ":" & errMsg2
          end try
        end try
      end tell
    `;

    try {
      const result = await runAppleScript(script);
      
      if (result === 'success') {
        return { success: true };
      }
      
      if (result.startsWith('error:')) {
        const parts = result.split(':');
        const errorCode = parts[1] || 'unknown';
        const errorMsg = parts.slice(2).join(':') || 'Unknown error';
        
        return {
          success: false,
          error: errorMsg,
          errorCode,
          recommendation: this.getRecommendation(errorCode, errorMsg),
        };
      }
      
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      return {
        success: false,
        error: errorMsg,
        errorCode: this.extractErrorCode(errorMsg),
        recommendation: this.getRecommendationFromError(errorMsg),
      };
    }
  }

  /**
   * Checks if Messages app is running.
   */
  async isMessagesRunning(): Promise<boolean> {
    const script = 'application "Messages" is running';
    try {
      const result = await runAppleScript(script);
      return result === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Launches Messages.app if not already running.
   */
  async launchMessages(): Promise<boolean> {
    const script = `
      tell application "Messages"
        activate
        delay 1
        return "launched"
      end tell
    `;
    try {
      await runAppleScript(script);
      return true;
    } catch {
      return false;
    }
  }

  private extractErrorCode(errorMsg: string): string {
    const match = errorMsg.match(/\((-?\d+)\)/);
    return match ? match[1] : 'unknown';
  }

  private getRecommendation(errorCode: string, errorMsg: string): string {
    const code = parseInt(errorCode, 10);
    
    switch (code) {
      case -1728:
        return 'The recipient was not found. Ensure the phone number includes country code (e.g., +1) or use an email address.';
      case -1743:
        return 'Automation permission denied. Go to System Settings → Privacy & Security → Automation and enable Messages for your terminal.';
      case -1708:
        return 'Messages.app does not understand this command. Try restarting Messages.app.';
      case -600:
        return 'Application is not running. Messages.app will be launched automatically on next attempt.';
      default:
        if (errorMsg.toLowerCase().includes('not authorized')) {
          return 'Permission denied. Grant Automation access in System Settings → Privacy & Security → Automation.';
        }
        return 'Check that Messages.app is signed in and the recipient is valid.';
    }
  }

  private getRecommendationFromError(errorMsg: string): string {
    if (errorMsg.includes('-1743') || errorMsg.toLowerCase().includes('not authorized')) {
      return 'Automation permission denied. Go to System Settings → Privacy & Security → Automation and enable Messages.';
    }
    if (errorMsg.includes('-1728')) {
      return 'Recipient not found. Use full phone number with country code or email address.';
    }
    return 'Ensure Messages.app is running and signed in.';
  }
}

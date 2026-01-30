import { runAppleScript } from 'run-applescript';

export class AppleScriptService {
  /**
   * Sends an iMessage to a recipient.
   * @param recipient The phone number or email address of the recipient.
   * @param message The message text to send.
   */
  async sendMessage(recipient: string, message: string): Promise<boolean> {
    // Escape quotes in message
    const escapedMessage = message.replace(/"/g, '\\"');
    
    // AppleScript to send message
    // Note: We try to find the buddy in any service, but usually it's the iMessage service.
    const script = `
      tell application "Messages"
        try
          set targetBuddy to buddy "${recipient}"
          send "${escapedMessage}" to targetBuddy
          return "success"
        on error errMsg
          return "error: " & errMsg
        end try
      end tell
    `;

    try {
      const result = await runAppleScript(script);
      if (result.startsWith('error:')) {
        throw new Error(result);
      }
      return true;
    } catch (error) {
      console.error('Failed to send message via AppleScript:', error);
      throw error;
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
}

import { runAppleScript } from 'run-applescript';
import { MessagingProvider, SendMessageOptions, SendMessageResult } from './types.js';

export class AppleScriptProvider implements MessagingProvider {
  public name = 'applescript';

  private normalizeRecipient(recipient: string): string {
    const trimmed = recipient.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    const isInternational = trimmed.startsWith('+');
    const cleaned = trimmed.replace(/[^\d]/g, '');
    return isInternational ? `+${cleaned}` : cleaned;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await runAppleScript('application "Messages" is running');
      return result === 'true';
    } catch {
      return false;
    }
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const { recipient, message } = options;
    
    // Retry logic with exponential backoff
    let lastResult: SendMessageResult = { success: false, error: 'Initial state' };
    const maxRetries = 2; // Total 3 attempts
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000;
        console.error(`[applescript] Retrying in ${delay}ms (attempt ${attempt + 1})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Ensure Messages is running before retry
        await this.ensureMessagesRunning();
      }
      
      lastResult = await this.executeSend(recipient, message);
      if (lastResult.success) return lastResult;
      
      // If permission error, don't bother retrying
      if (lastResult.error?.includes('-1743') || lastResult.recommendation?.includes('Automation')) {
        return lastResult;
      }
    }
    
    return lastResult;
  }

  private async ensureMessagesRunning(): Promise<void> {
    const isRunning = await this.isAvailable();
    if (!isRunning) {
      console.error('[applescript] Launching Messages.app...');
      const launchScript = `
        tell application "Messages"
          activate
          delay 2
        end tell
      `;
      try {
        await runAppleScript(launchScript);
      } catch (err) {
        console.error('[applescript] Failed to launch Messages:', err);
      }
    }
  }

  private async executeSend(recipient: string, message: string): Promise<SendMessageResult> {
    const normalizedRecipient = this.normalizeRecipient(recipient);
    
    const escapedMessage = message
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    
    const escapedRecipient = normalizedRecipient.replace(/"/g, '\\"');
    
    const script = `
      tell application "Messages"
        try
          set targetService to 1st account whose service type = iMessage
          set targetBuddy to participant "${escapedRecipient}" of targetService
          send "${escapedMessage}" to targetBuddy
          return "success"
        on error errMsg number errNum
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
          error: `AppleScript error ${errorCode}: ${errorMsg}`,
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

export interface SendMessageOptions {
  recipient: string;
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  recommendation?: string;
}

/**
 * Interface for messaging backends (AppleScript, IMCore, Protocol)
 */
export interface MessagingProvider {
  name: string;
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
  isAvailable(): Promise<boolean>;
}

import { MessagingProvider, SendMessageOptions, SendMessageResult } from './types.js';

/**
 * Placeholder for future Private API implementation (IMCore)
 * Requires SIP disabled and native bridge.
 */
export class NativeProvider implements MessagingProvider {
  public name = 'native-imcore';

  async isAvailable(): Promise<boolean> {
    // In the future, check if native module is compiled and SIP status
    return false;
  }

  async sendMessage(_options: SendMessageOptions): Promise<SendMessageResult> {
    return {
      success: false,
      error: 'Native IMCore provider is not yet implemented.',
      recommendation: 'Use the AppleScript provider for now.'
    };
  }
}

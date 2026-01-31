import { MessagingProvider, SendMessageOptions, SendMessageResult } from './types.js';

/**
 * Orchestrates multiple messaging providers with fallback logic.
 * Tries providers in order until one succeeds or all fail.
 */
export class FallbackProvider implements MessagingProvider {
  public name = 'fallback-manager';
  private providers: MessagingProvider[];

  constructor(providers: MessagingProvider[]) {
    this.providers = providers;
  }

  async isAvailable(): Promise<boolean> {
    // Available if at least one provider is available
    for (const provider of this.providers) {
      if (await provider.isAvailable()) return true;
    }
    return false;
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const errors: string[] = [];
    let lastRecommendation: string | undefined;

    for (const provider of this.providers) {
      try {
        if (!(await provider.isAvailable())) {
          console.error(`[${provider.name}] Provider not available, skipping...`);
          continue;
        }

        console.error(`[${provider.name}] Attempting to send message...`);
        const result = await provider.sendMessage(options);

        if (result.success) {
          console.error(`[${provider.name}] Message sent successfully.`);
          return result;
        }

        console.error(`[${provider.name}] Failed: ${result.error}`);
        errors.push(`${provider.name}: ${result.error}`);
        lastRecommendation = result.recommendation;
      } catch (err: any) {
        console.error(`[${provider.name}] Unexpected error: ${err.message}`);
        errors.push(`${provider.name}: ${err.message}`);
      }
    }

    return {
      success: false,
      error: `All providers failed: ${errors.join('; ')}`,
      recommendation: lastRecommendation || 'Ensure Messages.app is running and permissions are granted.'
    };
  }
}

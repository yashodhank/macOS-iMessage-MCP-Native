import { describe, it, expect, vi } from 'vitest';
import { AppleScriptService } from '../applescript.js';
import { runAppleScript } from 'run-applescript';

vi.mock('run-applescript');

describe('AppleScriptService', () => {
  const service = new AppleScriptService();

  it('should send a message successfully', async () => {
    (runAppleScript as any).mockResolvedValue('success');
    const result = await service.sendMessage('test@example.com', 'Hello');
    expect(result).toBe(true);
    expect(runAppleScript).toHaveBeenCalled();
  });

  it('should throw error on failure', async () => {
    (runAppleScript as any).mockResolvedValue('error: something went wrong');
    await expect(service.sendMessage('test@example.com', 'Hello')).rejects.toThrow('error: something went wrong');
  });
});

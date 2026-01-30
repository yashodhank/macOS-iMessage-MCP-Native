import { describe, it, expect, vi } from 'vitest';
import { AppleScriptService } from '../applescript.js';
import { runAppleScript } from 'run-applescript';

vi.mock('run-applescript');

describe('AppleScriptService', () => {
  const service = new AppleScriptService();

  it('should send a message successfully', async () => {
    (runAppleScript as any).mockResolvedValue('success');
    const result = await service.sendMessage('test@example.com', 'Hello');
    expect(result.success).toBe(true);
    expect(runAppleScript).toHaveBeenCalled();
  });

  it('should return error result on failure', async () => {
    (runAppleScript as any).mockResolvedValue('error:-1728:Can\'t get buddy');
    const result = await service.sendMessage('test@example.com', 'Hello');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('-1728');
    expect(result.recommendation).toContain('recipient');
  });
});

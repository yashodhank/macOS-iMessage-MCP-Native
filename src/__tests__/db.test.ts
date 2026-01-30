import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageDatabase } from '../db.js';
import Database from 'better-sqlite3';

vi.mock('better-sqlite3');

describe('MessageDatabase', () => {
  let db: MessageDatabase;
  let mockDbInstance: any;

  beforeEach(() => {
    mockDbInstance = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            guid: 'test-guid',
            text: 'Hello world',
            sender: 'test@example.com',
            date: 700000000, // Roughly 2023
            is_from_me: 0
          }
        ])
      }),
      close: vi.fn()
    };
    (Database as any).mockImplementation(function() { return mockDbInstance; });
    db = new MessageDatabase(':memory:');
  });

  it('should fetch recent messages', () => {
    const messages = db.getRecentMessages(1);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('Hello world');
    expect(mockDbInstance.prepare).toHaveBeenCalled();
  });

  it('should search messages', () => {
    db.searchMessages('Hello');
    expect(mockDbInstance.prepare).toHaveBeenCalledWith(expect.stringContaining('LIKE ?'));
  });
});

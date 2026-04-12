import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageDatabase } from '../db.js';
import Database from 'better-sqlite3';

// Module-level ref so the factory closure (evaluated once) can always
// return the instance that beforeEach sets up.
let currentMockDb: any = null;

vi.mock('better-sqlite3', () => ({
  // Must be a real function (not arrow) so `new Database(...)` works.
  default: function MockDB() { return currentMockDb; },
}));

const BASE_ROW = {
  guid: 'test-guid',
  text: 'Hello world',
  attributedBody: null,
  sender: 'test@example.com',
  date: 700000000,
  is_from_me: 0,
  reply_to_guid: null,
  is_read: 1,
  date_read: null,
  service: 'iMessage',
};

function makeMock(rows: any[] = [BASE_ROW]) {
  const stmt = { all: vi.fn().mockReturnValue(rows), get: vi.fn() };
  return {
    pragma: vi.fn(),
    prepare: vi.fn().mockReturnValue(stmt),
    close: vi.fn(),
    _stmt: stmt,   // expose for call-arg inspection
  };
}

describe('MessageDatabase', () => {
  let db: MessageDatabase;
  let mock: ReturnType<typeof makeMock>;

  beforeEach(() => {
    mock = makeMock();
    currentMockDb = mock;
    db = new MessageDatabase(':memory:');
  });

  it('returns recent messages', () => {
    const msgs = db.getRecentMessages(1);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('Hello world');
    expect(mock.prepare).toHaveBeenCalled();
  });

  it('searchMessages uses LIKE on text column', () => {
    db.searchMessages('Hello');
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/m\.text LIKE \?/);
  });

  it('searchMessages covers attributedBody via CAST trick', () => {
    db.searchMessages('debit');
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/CAST\(m\.attributedBody AS TEXT\) LIKE \?/);
  });

  it('getMessagesFromContact uses exact h.id = ? first', () => {
    db.getMessagesFromContact('+919876543210');
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/h\.id = \?/);
  });

  it('getMessagesFromContact falls back to LIKE for alphanumeric shortcodes', () => {
    // First prepare → exact match returns 0 rows; second → LIKE returns rows
    const emptyStmt = { all: vi.fn().mockReturnValue([]), get: vi.fn() };
    const rowStmt   = { all: vi.fn().mockReturnValue([BASE_ROW]), get: vi.fn() };
    mock.prepare
      .mockReturnValueOnce(emptyStmt)   // exact h.id = ?  → empty
      .mockReturnValue(rowStmt);        // h.id LIKE ?     → rows

    const msgs = db.getMessagesFromContact('HDFCBK');
    // 3 prepare calls: (1) exact h.id=?, (2) LIKE fallback, (3) enrichWithAttachments JOIN
    expect(mock.prepare).toHaveBeenCalledTimes(3);
    const fallbackSql: string = mock.prepare.mock.calls[1][0];
    expect(fallbackSql).toMatch(/h\.id LIKE \?/);
    expect(msgs).toHaveLength(1);
  });

  it('getMessagesFromSenderContains always uses LIKE with %keyword%', () => {
    db.getMessagesFromSenderContains('AXISBK');
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/h\.id LIKE \?/);
    // The bound argument should be wrapped in %…%
    const boundArg = mock._stmt.all.mock.calls[0][0];
    expect(boundArg).toBe('%AXISBK%');
  });

  it('date range params produce m.date >= ? and m.date <= ? clauses', () => {
    db.getRecentMessages(10, '2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z');
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/m\.date >= \?/);
    expect(sql).toMatch(/m\.date <= \?/);
  });

  it('searchContacts always uses LIKE for partial matching', () => {
    db.searchContacts('HDFCBK');
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/LIKE \?/);
  });

  it('getUnreadMessages filters is_read = 0 and is_from_me = 0', () => {
    db.getUnreadMessages(10);
    const sql: string = mock.prepare.mock.calls[0][0];
    expect(sql).toMatch(/m\.is_read = 0/);
    expect(sql).toMatch(/m\.is_from_me = 0/);
  });
});

import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

export interface Attachment {
  guid: string;
  filename: string;
  mime_type: string;
  total_bytes: number;
  transfer_name: string;
}

export interface Message {
  guid: string;
  text: string;
  sender: string;
  date: string;
  is_from_me: boolean;
  reply_to_guid?: string;
  is_read: boolean;
  date_read?: string;
  service: string;
  attachments?: Attachment[];
}

export interface Chat {
  chat_id: number;
  chat_identifier: string;
  display_name: string;
}

export interface Contact {
  handle_id: number;
  id: string;
  service: string;
}

/**
 * Extract visible text from an iMessage attributedBody blob.
 *
 * iMessage stores message text in two formats depending on macOS version:
 *
 *   1. typedstream  (magic: "stream") — the common case for SMS/MMS from
 *      carriers and bank shortcodes.  The NSString content is stored verbatim
 *      (UTF-8) between the "NSString" and "NSDictionary" class-name tags in
 *      the typedstream header.  A few non-printable metadata/length bytes
 *      precede the text; we scan forward and take the longest printable run.
 *
 *   2. NSKeyedArchiver binary plist (magic: "bplist00") — used by some modern
 *      iMessage threads.  We shell out to python3 plistlib as a fallback.
 */
function extractTextFromAttributedBody(body: Buffer | null): string | null {
  if (!body || body.length < 8) return null;

  const header = body.slice(0, 8).toString('ascii');

  // ── Path 1: typedstream (most bank/carrier SMS) ───────────────────────────
  // The typedstream magic "streamtyped" starts at offset 2, not 0 (two
  // non-printable header bytes precede it), so we can't rely on a slice(0,8)
  // prefix check.  Instead, look for the NSString/NSDictionary class tags
  // which are always present in any NSAttributedString typedstream blob.
  if (body.indexOf(Buffer.from('streamtyped')) >= 0) {
    const nsStrIdx  = body.indexOf(Buffer.from('NSString'));
    const nsDictIdx = body.indexOf(Buffer.from('NSDictionary'));
    if (nsStrIdx >= 0 && nsDictIdx > nsStrIdx) {
      // Slice from end of 'NSString' tag to start of 'NSDictionary'.
      // The first ~8 bytes are typedstream type/length metadata; the UTF-8
      // message text follows as the longest contiguous printable run.
      const slice = body.slice(nsStrIdx + 8 /* 'NSString'.length */, nsDictIdx);
      const s = slice.toString('utf8');
      let best = '';
      let run  = '';
      for (const ch of s) {
        const cp = ch.codePointAt(0)!;
        if (cp >= 0x20 && cp !== 0x7f) {
          run += ch;
        } else {
          if (run.length > best.length) best = run;
          run = '';
        }
      }
      if (run.length > best.length) best = run;
      const trimmed = best.trim();
      if (trimmed.length >= 8) return trimmed;
    }
  }

  // ── Path 2: NSKeyedArchiver binary plist ─────────────────────────────────
  if (header === 'bplist00') {
    try {
      const result = execFileSync('python3', ['-c', [
        'import sys, plistlib',
        'data = sys.stdin.buffer.read()',
        'try:',
        '  pl = plistlib.loads(data)',
        '  s = pl.get("NS.string", "")',
        '  print(s, end="")',
        'except Exception:',
        '  pass',
      ].join('\n')], {
        input: body,
        timeout: 3000,
        maxBuffer: 2 * 1024 * 1024,
      });
      const text = result.toString('utf8');
      if (text.length > 0) return text;
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Convert an ISO 8601 string to Apple nanoseconds (ns since 2001-01-01 UTC).
 * The message.date column stores raw nanoseconds since the Apple epoch.
 */
function isoToAppleNs(iso: string): number {
  const appleEpochMs = new Date('2001-01-01T00:00:00Z').getTime();
  const targetMs = new Date(iso).getTime();
  if (isNaN(targetMs)) throw new Error(`Invalid date string: ${iso}`);
  return (targetMs - appleEpochMs) * 1_000_000; // ms → ns
}

/**
 * Returns true for phone numbers (+91…, digits-only) and emails (contains @).
 * Returns false for alphanumeric bank/carrier shortcodes like AD-HDFCBK-S.
 * Used to decide whether to apply the LIKE fallback in getMessagesFromContact.
 */
function isPhoneOrEmail(handle: string): boolean {
  return handle.includes('@') || handle.startsWith('+') || /^\d+$/.test(handle);
}

// Shared column list used in every SELECT query so all methods return
// the same shape and rowToMessage() works uniformly.
const MSG_COLS = `
  m.guid,
  m.text,
  m.attributedBody,
  h.id AS sender,
  m.date / 1000000000 AS date,
  m.is_from_me,
  m.reply_to_guid,
  m.is_read,
  m.date_read / 1000000000 AS date_read,
  m.service
`;

export class MessageDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = process.env.CHAT_DB_PATH ||
      path.join(os.homedir(), 'Library/Messages/chat.db');
    this.db = this.openWithRetry(dbPath || defaultPath);
    this.db.pragma('query_only = 1');
  }

  private openWithRetry(finalPath: string, retries = 3): Database.Database {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return new Database(finalPath, { readonly: true, fileMustExist: true, timeout: 5000 });
      } catch (error: any) {
        lastError = error;
        if (error.message?.includes('database is locked') && i < retries - 1) {
          const delay = 500 * (i + 1);
          const start = Date.now();
          while (Date.now() - start < delay) { /* sync wait */ }
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private convertDate(appleTimeSec: number): string {
    const epoch = new Date('2001-01-01T00:00:00Z').getTime();
    return new Date(epoch + appleTimeSec * 1000).toISOString();
  }

  private rowToMessage(row: any): Message {
    return {
      guid: row.guid,
      text: row.text || extractTextFromAttributedBody(row.attributedBody) || '',
      sender: row.sender || (row.is_from_me ? 'me' : 'unknown'),
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me),
      reply_to_guid: row.reply_to_guid,
      is_read: Boolean(row.is_read),
      date_read: row.date_read ? this.convertDate(row.date_read) : undefined,
      service: row.service,
    };
  }

  /**
   * Build a SQL date-range fragment (AND-prefixed) and its bound params.
   * The raw m.date column holds Apple nanoseconds; we compare directly.
   */
  private dateRange(since?: string, before?: string): { sql: string; params: number[] } {
    const parts: string[] = [];
    const params: number[] = [];
    if (since)  { parts.push('m.date >= ?'); params.push(isoToAppleNs(since)); }
    if (before) { parts.push('m.date <= ?'); params.push(isoToAppleNs(before)); }
    return { sql: parts.length ? 'AND ' + parts.join(' AND ') : '', params };
  }

  getRecentMessages(limit = 20, since?: string, before?: string): Message[] {
    const dr = this.dateRange(since, before);
    const rows = this.db.prepare(`
      SELECT ${MSG_COLS}
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE (m.text IS NOT NULL OR m.attributedBody IS NOT NULL
             OR EXISTS (SELECT 1 FROM message_attachment_join maj WHERE maj.message_id = m.ROWID))
      ${dr.sql}
      ORDER BY m.date DESC LIMIT ?
    `).all(...dr.params, limit) as any[];
    return this.enrichWithAttachments(rows.map(r => this.rowToMessage(r)));
  }

  getUnreadMessages(limit = 50, since?: string, before?: string): Message[] {
    const dr = this.dateRange(since, before);
    const rows = this.db.prepare(`
      SELECT ${MSG_COLS}
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.is_read = 0 AND m.is_from_me = 0
        AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
      ${dr.sql}
      ORDER BY m.date DESC LIMIT ?
    `).all(...dr.params, limit) as any[];
    return this.enrichWithAttachments(rows.map(r => this.rowToMessage(r)));
  }

  /**
   * Full-text search across all messages.
   *
   * Searches the plain text column first (fast). For attributedBody-only rows
   * (common with bank SMS) uses SQLite's CAST trick: the NSKeyedArchiver blob
   * embeds the UTF-8 string verbatim, so CAST(attributedBody AS TEXT) LIKE ?
   * works as a cheap pre-filter before the Python decode.
   */
  searchMessages(searchText: string, limit = 20, since?: string, before?: string): Message[] {
    const dr = this.dateRange(since, before);
    const like = `%${searchText}%`;
    const rows = this.db.prepare(`
      SELECT ${MSG_COLS}
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE (
        m.text LIKE ?
        OR (m.text IS NULL AND m.attributedBody IS NOT NULL
            AND CAST(m.attributedBody AS TEXT) LIKE ?)
      )
      ${dr.sql}
      ORDER BY m.date DESC LIMIT ?
    `).all(like, like, ...dr.params, limit) as any[];
    return this.enrichWithAttachments(
      rows.map(r => this.rowToMessage(r))
          .filter(m => m.text.toLowerCase().includes(searchText.toLowerCase()))
    );
  }

  /**
   * Get messages from a specific handle.
   *
   * F26 fix — Indian bank/carrier SMS senders are stored with carrier prefixes,
   * e.g. "AD-HDFCBK-S(smsft_fi)", "AX-HDFCBK", "VM-HDFCBK-S(smsfp)".
   * A bare "HDFCBK" or even "AD-HDFCBK" exact match misses the other carriers.
   *
   * Strategy:
   *   1. Try exact match (fast path — correct for phone numbers and emails).
   *   2. If zero rows AND the handle is an alphanumeric shortcode (not a phone
   *      or email), retry with LIKE '%handle%' which matches every carrier
   *      variant automatically.
   *
   * For bank SMS where you already know you want the LIKE behaviour, call
   * getMessagesFromSenderContains() directly to skip the round-trip.
   */
  getMessagesFromContact(handle: string, limit = 20, since?: string, before?: string): Message[] {
    const dr = this.dateRange(since, before);
    const base = (where: string) => `
      SELECT ${MSG_COLS}
      FROM message m
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE ${where} ${dr.sql}
      ORDER BY m.date DESC LIMIT ?
    `;
    let rows = this.db.prepare(base('h.id = ?')).all(handle, ...dr.params, limit) as any[];

    // F26: fallback to LIKE for alphanumeric shortcodes (bank SMS, etc.)
    if (rows.length === 0 && !isPhoneOrEmail(handle)) {
      rows = this.db.prepare(base('h.id LIKE ?')).all(`%${handle}%`, ...dr.params, limit) as any[];
    }
    return this.enrichWithAttachments(rows.map(r => this.rowToMessage(r)));
  }

  /**
   * Get messages from any sender whose handle contains keyword (LIKE '%keyword%').
   *
   * This is the primary method for querying Indian bank SMS. Pass just the
   * stable bank code and all carrier variants are matched automatically:
   *
   *   getMessagesFromSenderContains('HDFCBK')
   *     → AD-HDFCBK, AX-HDFCBK-S(smsfp), VM-HDFCBK-S(smsft_fi), …  (61 handles)
   *
   *   getMessagesFromSenderContains('AXISBK')
   *     → AD-AXISBK, AX-AXISBK-S(smsft_fi), …
   *
   *   getMessagesFromSenderContains('CREDIN')
   *     → AD-CREDIN-S, AX-CREDIN-S(smsft_or), …
   *
   * Supports ISO 8601 date bounds for scoped lookups.
   */
  getMessagesFromSenderContains(keyword: string, limit = 100, since?: string, before?: string): Message[] {
    const dr = this.dateRange(since, before);
    const rows = this.db.prepare(`
      SELECT ${MSG_COLS}
      FROM message m
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE h.id LIKE ?
        AND m.is_from_me = 0
        AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
      ${dr.sql}
      ORDER BY m.date DESC LIMIT ?
    `).all(`%${keyword}%`, ...dr.params, limit) as any[];
    return this.enrichWithAttachments(rows.map(r => this.rowToMessage(r)));
  }

  /** Prefix-match variant kept for backwards compatibility. */
  getMessagesFromSenderPrefix(prefix: string, limit = 50, since?: string, before?: string): Message[] {
    const dr = this.dateRange(since, before);
    const rows = this.db.prepare(`
      SELECT ${MSG_COLS}
      FROM message m
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE h.id LIKE ? ${dr.sql}
      ORDER BY m.date DESC LIMIT ?
    `).all(`${prefix}%`, ...dr.params, limit) as any[];
    return this.enrichWithAttachments(rows.map(r => this.rowToMessage(r)));
  }

  private enrichWithAttachments(messages: Message[]): Message[] {
    if (messages.length === 0) return messages;
    const guids = messages.map(m => m.guid);
    const placeholders = guids.map(() => '?').join(',');
    const attachmentRows = this.db.prepare(`
      SELECT m.guid AS message_guid,
             a.guid AS attachment_guid,
             a.filename, a.mime_type, a.total_bytes, a.transfer_name
      FROM message m
      JOIN message_attachment_join maj ON m.ROWID = maj.message_id
      JOIN attachment a ON maj.attachment_id = a.ROWID
      WHERE m.guid IN (${placeholders})
    `).all(...guids) as any[];

    const map = new Map<string, Attachment[]>();
    for (const row of attachmentRows) {
      const att: Attachment = {
        guid: row.attachment_guid,
        filename: row.filename,
        mime_type: row.mime_type,
        total_bytes: row.total_bytes,
        transfer_name: row.transfer_name,
      };
      if (!map.has(row.message_guid)) map.set(row.message_guid, []);
      map.get(row.message_guid)!.push(att);
    }
    return messages.map(m => {
      const atts = map.get(m.guid);
      const extra = atts?.map(a =>
        `[Attachment: ${a.mime_type || 'unknown'}, name: ${a.transfer_name || 'unknown'}]`
      ).join(' ') ?? '';
      return { ...m, text: extra ? `${m.text} ${extra}`.trim() : m.text, attachments: atts };
    });
  }

  getAttachmentPath(guid: string): string | null {
    const row = this.db.prepare('SELECT filename FROM attachment WHERE guid = ?').get(guid) as any;
    if (!row?.filename) return null;
    return row.filename.startsWith('~/')
      ? path.join(os.homedir(), row.filename.slice(2))
      : row.filename;
  }

  listChats(): Chat[] {
    return this.db.prepare(
      'SELECT ROWID AS chat_id, chat_identifier, display_name FROM chat'
    ).all() as Chat[];
  }

  /**
   * Search handles by partial ID using LIKE '%query%'.
   * Always uses infix matching so alphanumeric bank shortcodes are discoverable
   * without knowing the carrier prefix.
   */
  searchContacts(query: string): Contact[] {
    return this.db.prepare(
      'SELECT ROWID AS handle_id, id, service FROM handle WHERE id LIKE ?'
    ).all(`%${query}%`) as Contact[];
  }

  close() { this.db.close(); }
}

import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';

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
  id: string; // phone or email
  service: string;
}

export class MessageDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = process.env.CHAT_DB_PATH || path.join(os.homedir(), 'Library/Messages/chat.db');
    const finalPath = dbPath || defaultPath;
    
    // Open in read-only mode to avoid locking issues
    // Added retry logic and safer pragmas
    this.db = this.openWithRetry(finalPath);
    this.db.pragma('query_only = 1');
  }

  private openWithRetry(finalPath: string, retries: number = 3): Database.Database {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return new Database(finalPath, { readonly: true, fileMustExist: true, timeout: 5000 });
      } catch (error: any) {
        lastError = error;
        if (error.message?.includes('database is locked') && i < retries - 1) {
          // Sleep for a bit before retrying
          const delay = 500 * (i + 1);
          const syncWait = (ms: number) => {
            const start = Date.now();
            while (Date.now() - start < ms) { /* sync wait */ }
          };
          syncWait(delay);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Converts Apple's Mac Absolute Time (seconds since Jan 1, 2001) to ISO string.
   */
  private convertDate(appleTime: number): string {
    const epoch = new Date('2001-01-01T00:00:00Z').getTime();
    const date = new Date(epoch + appleTime * 1000);
    return date.toISOString();
  }

  getRecentMessages(limit: number = 20): Message[] {
    const query = `
      SELECT 
        m.guid,
        m.text,
        h.id as sender,
        m.date / 1000000000 as date,
        m.is_from_me,
        m.reply_to_guid,
        m.is_read,
        m.date_read / 1000000000 as date_read,
        m.service
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.text IS NOT NULL OR EXISTS (SELECT 1 FROM message_attachment_join maj WHERE maj.message_id = m.ROWID)
      ORDER BY m.date DESC
      LIMIT ?
    `;
    
    const rows = this.db.prepare(query).all(limit) as any[];
    const messages = rows.map(row => ({
      guid: row.guid,
      text: row.text || '',
      sender: row.sender || (row.is_from_me ? 'me' : 'unknown'),
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me),
      reply_to_guid: row.reply_to_guid,
      is_read: Boolean(row.is_read),
      date_read: row.date_read ? this.convertDate(row.date_read) : undefined,
      service: row.service
    }));

    return this.enrichWithAttachments(messages);
  }

  private enrichWithAttachments(messages: Message[]): Message[] {
    if (messages.length === 0) return messages;

    const guids = messages.map(m => m.guid);
    const placeholders = guids.map(() => '?').join(',');
    
    const query = `
      SELECT 
        m.guid as message_guid,
        a.guid as attachment_guid,
        a.filename,
        a.mime_type,
        a.total_bytes,
        a.transfer_name
      FROM message m
      JOIN message_attachment_join maj ON m.ROWID = maj.message_id
      JOIN attachment a ON maj.attachment_id = a.ROWID
      WHERE m.guid IN (${placeholders})
    `;

    const attachmentRows = this.db.prepare(query).all(...guids) as any[];
    
    const attachmentMap = new Map<string, Attachment[]>();
    attachmentRows.forEach(row => {
      const attachment: Attachment = {
        guid: row.attachment_guid,
        filename: row.filename,
        mime_type: row.mime_type,
        total_bytes: row.total_bytes,
        transfer_name: row.transfer_name
      };
      
      if (!attachmentMap.has(row.message_guid)) {
        attachmentMap.set(row.message_guid, []);
      }
      attachmentMap.get(row.message_guid)!.push(attachment);
    });

    return messages.map(m => {
      const messageAttachments = attachmentMap.get(m.guid);
      let text = m.text;
      
      if (messageAttachments && messageAttachments.length > 0) {
        const placeholders = messageAttachments.map(a => 
          `[Attachment: ${a.mime_type || 'unknown'}, name: ${a.transfer_name || 'unknown'}]`
        ).join(' ');
        text = `${text} ${placeholders}`.trim();
      }

      return {
        ...m,
        text,
        attachments: messageAttachments
      };
    });
  }

  getAttachmentPath(guid: string): string | null {
    const query = `
      SELECT filename FROM attachment WHERE guid = ?
    `;
    const row = this.db.prepare(query).get(guid) as any;
    if (!row || !row.filename) return null;

    // Handle ~/ path prefix
    let filePath = row.filename;
    if (filePath.startsWith('~/')) {
      filePath = path.join(os.homedir(), filePath.slice(2));
    }
    return filePath;
  }

  searchMessages(searchText: string, limit: number = 20): Message[] {
    const query = `
      SELECT 
        m.guid,
        m.text,
        h.id as sender,
        m.date / 1000000000 as date,
        m.is_from_me,
        m.reply_to_guid,
        m.is_read,
        m.date_read / 1000000000 as date_read,
        m.service
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.text LIKE ?
      ORDER BY m.date DESC
      LIMIT ?
    `;
    
    const rows = this.db.prepare(query).all(`%${searchText}%`, limit) as any[];
    const messages = rows.map(row => ({
      guid: row.guid,
      text: row.text || '',
      sender: row.sender || (row.is_from_me ? 'me' : 'unknown'),
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me),
      reply_to_guid: row.reply_to_guid,
      is_read: Boolean(row.is_read),
      date_read: row.date_read ? this.convertDate(row.date_read) : undefined,
      service: row.service
    }));

    return this.enrichWithAttachments(messages);
  }

  getMessagesFromContact(contactHandle: string, limit: number = 20): Message[] {
    const query = `
      SELECT 
        m.guid,
        m.text,
        h.id as sender,
        m.date / 1000000000 as date,
        m.is_from_me,
        m.reply_to_guid,
        m.is_read,
        m.date_read / 1000000000 as date_read,
        m.service
      FROM message m
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE h.id = ?
      ORDER BY m.date DESC
      LIMIT ?
    `;
    
    const rows = this.db.prepare(query).all(contactHandle, limit) as any[];
    const messages = rows.map(row => ({
      guid: row.guid,
      text: row.text || '',
      sender: row.sender,
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me),
      reply_to_guid: row.reply_to_guid,
      is_read: Boolean(row.is_read),
      date_read: row.date_read ? this.convertDate(row.date_read) : undefined,
      service: row.service
    }));

    return this.enrichWithAttachments(messages);
  }

  listChats(): Chat[] {
    const query = `
      SELECT 
        ROWID as chat_id,
        chat_identifier,
        display_name
      FROM chat
    `;
    return this.db.prepare(query).all() as Chat[];
  }

  searchContacts(query: string): Contact[] {
    const sql = `
      SELECT 
        ROWID as handle_id,
        id,
        service
      FROM handle
      WHERE id LIKE ?
    `;
    return this.db.prepare(sql).all(`%${query}%`) as Contact[];
  }

  close() {
    this.db.close();
  }
}

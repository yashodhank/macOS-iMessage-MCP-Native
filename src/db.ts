import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';

export interface Message {
  guid: string;
  text: string;
  sender: string;
  date: string;
  is_from_me: boolean;
}

export interface Chat {
  chat_id: number;
  chat_identifier: string;
  display_name: string;
}

export class MessageDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = process.env.CHAT_DB_PATH || path.join(os.homedir(), 'Library/Messages/chat.db');
    const finalPath = dbPath || defaultPath;
    
    // Open in read-only mode to avoid locking issues
    this.db = new Database(finalPath, { readonly: true, fileMustExist: true });
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
        m.is_from_me
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.text IS NOT NULL
      ORDER BY m.date DESC
      LIMIT ?
    `;
    
    const rows = this.db.prepare(query).all(limit) as any[];
    return rows.map(row => ({
      guid: row.guid,
      text: row.text,
      sender: row.sender || (row.is_from_me ? 'me' : 'unknown'),
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me)
    }));
  }

  searchMessages(searchText: string, limit: number = 20): Message[] {
    const query = `
      SELECT 
        m.guid,
        m.text,
        h.id as sender,
        m.date / 1000000000 as date,
        m.is_from_me
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.text LIKE ?
      ORDER BY m.date DESC
      LIMIT ?
    `;
    
    const rows = this.db.prepare(query).all(`%${searchText}%`, limit) as any[];
    return rows.map(row => ({
      guid: row.guid,
      text: row.text,
      sender: row.sender || (row.is_from_me ? 'me' : 'unknown'),
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me)
    }));
  }

  getMessagesFromContact(contactHandle: string, limit: number = 20): Message[] {
    const query = `
      SELECT 
        m.guid,
        m.text,
        h.id as sender,
        m.date / 1000000000 as date,
        m.is_from_me
      FROM message m
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE h.id = ? AND m.text IS NOT NULL
      ORDER BY m.date DESC
      LIMIT ?
    `;
    
    const rows = this.db.prepare(query).all(contactHandle, limit) as any[];
    return rows.map(row => ({
      guid: row.guid,
      text: row.text,
      sender: row.sender,
      date: this.convertDate(row.date),
      is_from_me: Boolean(row.is_from_me)
    }));
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

  close() {
    this.db.close();
  }
}

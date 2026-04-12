#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MessageDatabase } from "./db.js";
import { performHealthCheck } from "./permissions.js";
import { z } from "zod";
import * as toon from "./toon.js";
import { MessagingProvider } from "./providers/types.js";
import { AppleScriptProvider } from "./providers/applescript.js";
import { NativeProvider } from "./providers/native.js";
import { FallbackProvider } from "./providers/fallback.js";

// Optional ISO 8601 date param shared across multiple tools.
const DateParams = {
  since: {
    type: "string",
    description: "ISO 8601 lower bound, e.g. '2025-01-01T00:00:00Z'. Omit for no lower limit.",
  },
  before: {
    type: "string",
    description: "ISO 8601 upper bound, e.g. '2025-12-31T23:59:59Z'. Omit for no upper limit.",
  },
};

const DateSchema = z.object({
  since: z.string().optional(),
  before: z.string().optional(),
});

class IMessageServer {
  private server: Server;
  private db: MessageDatabase | null = null;
  private messagingProvider: MessagingProvider;
  private dbInitError: string | null = null;

  constructor() {
    this.server = new Server(
      { name: "imessage-mcp", version: "1.2.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    try {
      this.db = new MessageDatabase();
    } catch (error: any) {
      this.dbInitError = error.message || 'Failed to initialize database';
      console.error("[Warning] Database initialization failed:", this.dbInitError);
    }

    this.messagingProvider = new FallbackProvider([
      new NativeProvider(),
      new AppleScriptProvider(),
    ]);

    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => { await this.cleanup(); process.exit(0); });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [{
        uri: "imessage://recent",
        name: "Recent iMessages",
        description: "Real-time view of the 50 most recent iMessages",
        mimeType: "text/toon; charset=utf-8",
      }],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (request.params.uri === "imessage://recent") {
        if (!this.db) throw new McpError(ErrorCode.InternalError, "Database unavailable");
        const messages = this.db.getRecentMessages(50);
        return { contents: [{ uri: request.params.uri, mimeType: "text/toon; charset=utf-8",
            text: toon.stringify(messages, { arrayKey: 'messages' }) }] };
      }
      throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${request.params.uri}`);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "send_message",
          description: "Send an iMessage or SMS via Apple Messages",
          inputSchema: {
            type: "object",
            properties: {
              recipient: { type: "string", description: "Phone number or email of recipient" },
              message:   { type: "string", description: "Text content to send" },
            },
            required: ["recipient", "message"],
          },
        },
        {
          name: "get_recent_messages",
          description: "Fetch recent messages from the iMessage database",
          inputSchema: {
            type: "object",
            properties: {
              limit:  { type: "number", description: "Number of messages (default 20)", default: 20 },
              ...DateParams,
            },
          },
        },
        {
          name: "get_unread_messages",
          description: "Fetch unread incoming messages",
          inputSchema: {
            type: "object",
            properties: {
              limit:  { type: "number", description: "Max results (default 50)", default: 50 },
              ...DateParams,
            },
          },
        },
        {
          name: "search_messages",
          description: "Search messages by text content. Works on both plain-text and bank SMS (attributedBody).",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Text to search for" },
              limit: { type: "number", description: "Max results (default 20)", default: 20 },
              ...DateParams,
            },
            required: ["query"],
          },
        },
        {
          name: "get_contact_messages",
          description: "Get messages from a contact by exact handle (phone/email). " +
            "For alphanumeric bank SMS senders (e.g. 'HDFCBK'), automatically falls back " +
            "to LIKE '%handle%' if exact match returns nothing — matching all carrier variants.",
          inputSchema: {
            type: "object",
            properties: {
              handle: { type: "string", description: "Phone, email, or bank shortcode (e.g. HDFCBK)" },
              limit:  { type: "number", description: "Max messages (default 20)", default: 20 },
              ...DateParams,
            },
            required: ["handle"],
          },
        },
        {
          name: "get_sender_messages",
          description: "Get messages from any sender whose handle CONTAINS the keyword (LIKE '%keyword%'). " +
            "Purpose-built for Indian bank/carrier SMS where the same bank has many handle variants: " +
            "'HDFCBK' matches AD-HDFCBK, AX-HDFCBK-S(smsft_fi), VM-HDFCBK-S(smsfp), … " +
            "'AXISBK' matches AD-AXISBK-S, AX-AXISBK-S(smsft_or), … " +
            "'CREDIN' matches AD-CREDIN-S, AX-CREDIN-S(smsft_or), … " +
            "Also works for any partial handle substring. Use search_contacts first to discover available senders.",
          inputSchema: {
            type: "object",
            properties: {
              sender_keyword: { type: "string",
                description: "Substring to match against sender handle, e.g. 'HDFCBK', 'AXISBK', 'CREDIN', 'ICICIT'" },
              limit: { type: "number", description: "Max messages (default 100)", default: 100 },
              ...DateParams,
            },
            required: ["sender_keyword"],
          },
        },
        {
          name: "list_chats",
          description: "List all chat conversations",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "search_contacts",
          description: "Search handles by partial phone, email, or shortcode. " +
            "Always uses LIKE '%query%' so bank shortcodes are findable without knowing the carrier prefix.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Partial phone number, email, or bank code" },
            },
            required: ["query"],
          },
        },
        {
          name: "get_attachment_path",
          description: "Get the local file path for an attachment GUID",
          inputSchema: {
            type: "object",
            properties: {
              guid: { type: "string", description: "Attachment GUID" },
            },
            required: ["guid"],
          },
        },
        {
          name: "health_check",
          description: "Check server health, permissions, and system requirements",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const db = this.db;
        const args = request.params.arguments ?? {};

        switch (request.params.name) {

          case "send_message": {
            const { recipient, message } = z.object({
              recipient: z.string(), message: z.string(),
            }).parse(args);
            const result = await this.messagingProvider.sendMessage({ recipient, message });
            if (result.success) {
              return { content: [{ type: "text", text: `Successfully sent message to ${recipient}` }] };
            }
            return { content: [{ type: "text", text: toon.stringify({
              success: false, error: result.error,
              errorCode: result.errorCode, recommendation: result.recommendation,
            }) }], isError: true };
          }

          case "get_recent_messages": {
            if (!db) return this.dbUnavailableResponse();
            const { limit, since, before } = z.object({
              limit: z.number().optional().default(20), ...DateSchema.shape,
            }).parse(args);
            return this.msgResponse(db.getRecentMessages(limit, since, before));
          }

          case "get_unread_messages": {
            if (!db) return this.dbUnavailableResponse();
            const { limit, since, before } = z.object({
              limit: z.number().optional().default(50), ...DateSchema.shape,
            }).parse(args);
            return this.msgResponse(db.getUnreadMessages(limit, since, before));
          }

          case "search_messages": {
            if (!db) return this.dbUnavailableResponse();
            const { query, limit, since, before } = z.object({
              query: z.string(),
              limit: z.number().optional().default(20),
              ...DateSchema.shape,
            }).parse(args);
            return this.msgResponse(db.searchMessages(query, limit, since, before));
          }

          case "get_contact_messages": {
            if (!db) return this.dbUnavailableResponse();
            const { handle, limit, since, before } = z.object({
              handle: z.string(),
              limit: z.number().optional().default(20),
              ...DateSchema.shape,
            }).parse(args);
            return this.msgResponse(db.getMessagesFromContact(handle, limit, since, before));
          }

          case "get_sender_messages": {
            if (!db) return this.dbUnavailableResponse();
            const { sender_keyword, limit, since, before } = z.object({
              sender_keyword: z.string(),
              limit: z.number().optional().default(100),
              ...DateSchema.shape,
            }).parse(args);
            return this.msgResponse(db.getMessagesFromSenderContains(sender_keyword, limit, since, before));
          }

          case "list_chats": {
            if (!db) return this.dbUnavailableResponse();
            return { content: [{ type: "text", text: toon.stringify(db.listChats(), { arrayKey: 'chats' }) }] };
          }

          case "search_contacts": {
            if (!db) return this.dbUnavailableResponse();
            const { query } = z.object({ query: z.string() }).parse(args);
            return { content: [{ type: "text",
              text: toon.stringify(db.searchContacts(query), { arrayKey: 'contacts' }) }] };
          }

          case "get_attachment_path": {
            if (!db) return this.dbUnavailableResponse();
            const { guid } = z.object({ guid: z.string() }).parse(args);
            const filePath = db.getAttachmentPath(guid);
            if (!filePath) return { content: [{ type: "text",
              text: `Attachment ${guid} not found.` }], isError: true };
            return { content: [{ type: "text", text: filePath }] };
          }

          case "health_check": {
            const result = await performHealthCheck();
            return { content: [{ type: "text", text: toon.stringify(result) }] };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        if (error instanceof z.ZodError)
          throw new McpError(ErrorCode.InvalidParams,
            `Invalid arguments: ${error.issues.map(e => e.message).join(", ")}`);
        throw error;
      }
    });
  }

  private msgResponse(messages: any[]) {
    return { content: [{ type: "text" as const,
      text: toon.stringify(messages, { arrayKey: 'messages' }) }] };
  }

  private dbUnavailableResponse() {
    return { content: [{ type: "text" as const, text: toon.stringify({
      error: "Database unavailable",
      reason: this.dbInitError || "Full Disk Access permission required",
      recommendation: "Run health_check for details.",
    }) }], isError: true };
  }

  async cleanup() { if (this.db) this.db.close(); }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("iMessage MCP server running on stdio");
  }
}

const server = new IMessageServer();
server.run().catch(console.error);

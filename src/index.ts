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

class IMessageServer {
  private server: Server;
  private db: MessageDatabase | null = null;
  private messagingProvider: MessagingProvider;
  private dbInitError: string | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "imessage-mcp",
        version: "1.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Try to initialize database, but don't fail if permissions are missing
    try {
      this.db = new MessageDatabase();
    } catch (error: any) {
      this.dbInitError = error.message || 'Failed to initialize database';
      console.error("[Warning] Database initialization failed:", this.dbInitError);
      console.error("[Warning] Read operations will be unavailable. Run health_check for details.");
    }
    
    // Use FallbackProvider: Try Native (IMCore) first, then AppleScript
    this.messagingProvider = new FallbackProvider([
      new NativeProvider(),
      new AppleScriptProvider(),
    ]);

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "imessage://recent",
          name: "Recent iMessages",
          description: "A real-time view of the 50 most recent iMessages",
          mimeType: "text/toon; charset=utf-8",
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (request.params.uri === "imessage://recent") {
        if (!this.db) {
          throw new McpError(ErrorCode.InternalError, "Database unavailable");
        }
        const messages = this.db.getRecentMessages(50);
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: "text/toon; charset=utf-8",
              text: toon.stringify(messages, { arrayKey: 'messages' }),
            },
          ],
        };
      }
      throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${request.params.uri}`);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "send_message",
          description: "Send an iMessage or SMS to a recipient using Apple's Messages app",
          inputSchema: {
            type: "object",
            properties: {
              recipient: {
                type: "string",
                description: "The phone number or email of the recipient",
              },
              message: {
                type: "string",
                description: "The text message content to send",
              },
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
              limit: {
                type: "number",
                description: "Number of messages to fetch (default 20)",
                default: 20,
              },
            },
          },
        },
        {
          name: "search_messages",
          description: "Search for messages containing specific text",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The text to search for",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default 20)",
                default: 20,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_contact_messages",
          description: "Get message history with a specific contact",
          inputSchema: {
            type: "object",
            properties: {
              handle: {
                type: "string",
                description: "The phone number or email of the contact",
              },
              limit: {
                type: "number",
                description: "Maximum number of messages (default 20)",
                default: 20,
              },
            },
            required: ["handle"],
          },
        },
        {
          name: "list_chats",
          description: "List all active chat conversations",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "search_contacts",
          description: "Search for contacts by phone number or email",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Partial phone number or email to search for",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_attachment_path",
          description: "Get the local file path for an attachment by its GUID",
          inputSchema: {
            type: "object",
            properties: {
              guid: {
                type: "string",
                description: "The GUID of the attachment",
              },
            },
            required: ["guid"],
          },
        },
        {
          name: "health_check",
          description: "Check the health status of the MCP server including permissions and system requirements",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "send_message": {
            const { recipient, message } = z
              .object({
                recipient: z.string(),
                message: z.string(),
              })
              .parse(request.params.arguments);

            const result = await this.messagingProvider.sendMessage({ recipient, message });
            
            if (result.success) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Successfully sent message to ${recipient}`,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: "text",
                    text: toon.stringify({
                      success: false,
                      error: result.error,
                      errorCode: result.errorCode,
                      recommendation: result.recommendation,
                    }),
                  },
                ],
                isError: true,
              };
            }
          }

          case "get_recent_messages": {
            if (!this.db) {
              return this.dbUnavailableResponse();
            }
            const { limit } = z
              .object({
                limit: z.number().optional().default(20),
              })
              .parse(request.params.arguments || {});

            const messages = this.db.getRecentMessages(limit);
            return {
              content: [
                {
                  type: "text",
                  text: toon.stringify(messages, { arrayKey: 'messages' }),
                },
              ],
            };
          }

          case "search_messages": {
            if (!this.db) {
              return this.dbUnavailableResponse();
            }
            const { query, limit } = z
              .object({
                query: z.string(),
                limit: z.number().optional().default(20),
              })
              .parse(request.params.arguments);

            const messages = this.db.searchMessages(query, limit);
            return {
              content: [
                {
                  type: "text",
                  text: toon.stringify(messages, { arrayKey: 'messages' }),
                },
              ],
            };
          }

          case "get_contact_messages": {
            if (!this.db) {
              return this.dbUnavailableResponse();
            }
            const { handle, limit } = z
              .object({
                handle: z.string(),
                limit: z.number().optional().default(20),
              })
              .parse(request.params.arguments);

            const messages = this.db.getMessagesFromContact(handle, limit);
            return {
              content: [
                {
                  type: "text",
                  text: toon.stringify(messages, { arrayKey: 'messages' }),
                },
              ],
            };
          }

          case "list_chats": {
            if (!this.db) {
              return this.dbUnavailableResponse();
            }
            const chats = this.db.listChats();
            return {
              content: [
                {
                  type: "text",
                  text: toon.stringify(chats, { arrayKey: 'chats' }),
                },
              ],
            };
          }

          case "search_contacts": {
            if (!this.db) {
              return this.dbUnavailableResponse();
            }
            const { query } = z
              .object({
                query: z.string(),
              })
              .parse(request.params.arguments);

            const contacts = this.db.searchContacts(query);
            return {
              content: [
                {
                  type: "text",
                  text: toon.stringify(contacts, { arrayKey: 'contacts' }),
                },
              ],
            };
          }

          case "get_attachment_path": {
            if (!this.db) {
              return this.dbUnavailableResponse();
            }
            const { guid } = z
              .object({
                guid: z.string(),
              })
              .parse(request.params.arguments);

            const path = this.db.getAttachmentPath(guid);
            if (!path) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Attachment with GUID ${guid} not found.`,
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: "text",
                  text: path,
                },
              ],
            };
          }

          case "health_check": {
            const healthResult = await performHealthCheck();
            return {
              content: [
                {
                  type: "text",
                  text: toon.stringify(healthResult),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid arguments: ${error.issues.map((e) => e.message).join(", ")}`
          );
        }
        throw error;
      }
    });
  }

  private dbUnavailableResponse() {
    return {
      content: [
        {
          type: "text" as const,
          text: toon.stringify({
            error: "Database unavailable",
            reason: this.dbInitError || "Full Disk Access permission required",
            recommendation: "Run the health_check tool to diagnose and fix permission issues.",
          }),
        },
      ],
      isError: true,
    };
  }

  async cleanup() {
    if (this.db) {
      this.db.close();
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("iMessage MCP server running on stdio");
  }
}

const server = new IMessageServer();
server.run().catch(console.error);

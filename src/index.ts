#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { MessageDatabase } from "./db.js";
import { AppleScriptService } from "./applescript.js";
import { performHealthCheck, formatHealthCheckResult, checkFullDiskAccess } from "./permissions.js";
import { z } from "zod";

class IMessageServer {
  private server: Server;
  private db: MessageDatabase | null = null;
  private appleScript: AppleScriptService;
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
    
    this.appleScript = new AppleScriptService();

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
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

            const result = await this.appleScript.sendMessage(recipient, message);
            
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
                    text: JSON.stringify({
                      success: false,
                      error: result.error,
                      errorCode: result.errorCode,
                      recommendation: result.recommendation,
                    }, null, 2),
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
                  text: JSON.stringify(messages, null, 2),
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
                  text: JSON.stringify(messages, null, 2),
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
                  text: JSON.stringify(messages, null, 2),
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
                  text: JSON.stringify(chats, null, 2),
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
                  text: formatHealthCheckResult(healthResult),
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
          text: JSON.stringify({
            error: "Database unavailable",
            reason: this.dbInitError || "Full Disk Access permission required",
            recommendation: "Run the health_check tool to diagnose and fix permission issues.",
          }, null, 2),
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

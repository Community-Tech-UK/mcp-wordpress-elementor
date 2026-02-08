#!/usr/bin/env node
import * as dotenv from 'dotenv';
dotenv.config();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { allTools, toolHandlers } from './tools/index.js';
import { logToFile } from './wordpress.js';

const server = new McpServer(
  { name: 'wordpress-elementor', version: '1.0.0' },
  {
    capabilities: {
      tools: allTools.reduce(
        (acc, tool) => {
          acc[tool.name] = tool;
          return acc;
        },
        {} as Record<string, any>
      ),
    },
  }
);

// Register each tool with its handler
for (const tool of allTools) {
  const handler = toolHandlers[tool.name];
  if (!handler) continue;

  const wrappedHandler = async (args: any) => {
    const result = await handler(args);
    return {
      content: result.toolResult.content.map((item: any) => ({
        ...item,
        type: 'text' as const,
      })),
      isError: result.toolResult.isError,
    };
  };

  const zodSchema = z.object(tool.inputSchema.properties);
  server.tool(tool.name, tool.description, zodSchema.shape, wrappedHandler);
}

async function main() {
  logToFile('Starting WordPress + Elementor MCP server...');

  const apiUrl =
    process.env.WORDPRESS_API_URL || process.env.WORDPRESS_BASE_URL;
  if (!apiUrl) {
    logToFile('Missing WORDPRESS_API_URL. Check your .env or environment.');
    process.exit(1);
  }

  try {
    logToFile('Initializing WordPress client...');
    const { initWordPress } = await import('./wordpress.js');
    await initWordPress();
    logToFile('WordPress client initialized.');

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logToFile('MCP server running on stdio');
  } catch (error) {
    logToFile(`Failed to initialize server: ${error}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('Startup error:', error);
  process.exit(1);
});

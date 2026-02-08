import { makeWordPressRequest } from '../wordpress.js';
import { z } from 'zod';

// Zod schemas
const listPluginsSchema = z.object({
  status: z.enum(['active', 'inactive']).optional().default('active').describe('Limit results to plugins with a specific status'),
}).strict();

const getPluginSchema = z.object({
  plugin: z.string().describe('Plugin identifier (e.g., "plugin-folder/plugin-file.php")'),
}).strict();

const activatePluginSchema = z.object({
  plugin: z.string().describe('Plugin identifier to activate (e.g., "plugin-folder/plugin-file.php")'),
}).strict();

const deactivatePluginSchema = z.object({
  plugin: z.string().describe('Plugin identifier to deactivate (e.g., "plugin-folder/plugin-file.php")'),
}).strict();

const createPluginSchema = z.object({
  slug: z.string().describe('Plugin slug from WordPress.org repository'),
  status: z.enum(['inactive', 'active']).optional().default('active').describe('Plugin status after installation'),
}).strict();

// Tool definitions
export const pluginsTools = [
  {
    name: "list_plugins",
    description: "List all installed plugins with optional status filter",
    inputSchema: { type: "object" as const, properties: listPluginsSchema.shape }
  },
  {
    name: "get_plugin",
    description: "Retrieve details of a specific plugin by identifier",
    inputSchema: { type: "object" as const, properties: getPluginSchema.shape, required: ['plugin'] }
  },
  {
    name: "activate_plugin",
    description: "Activate an installed plugin",
    inputSchema: { type: "object" as const, properties: activatePluginSchema.shape, required: ['plugin'] }
  },
  {
    name: "deactivate_plugin",
    description: "Deactivate an active plugin",
    inputSchema: { type: "object" as const, properties: deactivatePluginSchema.shape, required: ['plugin'] }
  },
  {
    name: "create_plugin",
    description: "Install a plugin from WordPress.org repository",
    inputSchema: { type: "object" as const, properties: createPluginSchema.shape, required: ['slug'] }
  },
];

// Handlers
export const pluginsHandlers: Record<string, (params: any) => Promise<any>> = {
  list_plugins: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', 'plugins', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error listing plugins: ${msg}` }] } };
    }
  },
  get_plugin: async (params) => {
    try {
      const response = await makeWordPressRequest('GET', `plugins/${params.plugin}`);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting plugin: ${msg}` }] } };
    }
  },
  activate_plugin: async (params) => {
    try {
      const response = await makeWordPressRequest('PUT', `plugins/${params.plugin}`, { status: 'active' });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error activating plugin: ${msg}` }] } };
    }
  },
  deactivate_plugin: async (params) => {
    try {
      const response = await makeWordPressRequest('PUT', `plugins/${params.plugin}`, { status: 'inactive' });
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error deactivating plugin: ${msg}` }] } };
    }
  },
  create_plugin: async (params) => {
    try {
      const response = await makeWordPressRequest('POST', 'plugins', params);
      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error installing plugin: ${msg}` }] } };
    }
  },
};

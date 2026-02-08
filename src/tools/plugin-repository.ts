import { searchWordPressPluginRepository } from '../wordpress.js';
import { z } from 'zod';
import axios from 'axios';

// Zod schemas
const searchPluginRepositorySchema = z.object({
  search: z.string().describe('Search term to find plugins in WordPress.org repository'),
  page: z.number().min(1).optional().default(1).describe('Page number of the results'),
  per_page: z.number().min(1).max(100).optional().default(10).describe('Maximum number of results to return per page (1-100)'),
}).strict();

const getPluginDetailsSchema = z.object({
  slug: z.string().describe('Plugin slug from WordPress.org repository'),
}).strict();

// Tool definitions
export const pluginRepositoryTools = [
  {
    name: "search_plugin_repository",
    description: "Search for plugins in the WordPress.org plugin repository",
    inputSchema: { type: "object" as const, properties: searchPluginRepositorySchema.shape, required: ['search'] }
  },
  {
    name: "get_plugin_details",
    description: "Get detailed information about a specific plugin from WordPress.org repository",
    inputSchema: { type: "object" as const, properties: getPluginDetailsSchema.shape, required: ['slug'] }
  },
];

// Handlers
export const pluginRepositoryHandlers: Record<string, (params: any) => Promise<any>> = {
  search_plugin_repository: async (params) => {
    try {
      const result = await searchWordPressPluginRepository(params.search, params.page, params.per_page);

      // Map results to a cleaner format
      const mappedPlugins = result.plugins.map((plugin: any) => ({
        name: plugin.name,
        slug: plugin.slug,
        version: plugin.version,
        author: plugin.author,
        requires_wp: plugin.requires,
        tested: plugin.tested,
        rating: plugin.rating,
        active_installs: plugin.active_installs,
        downloaded: plugin.downloaded,
        last_updated: plugin.last_updated,
        short_description: plugin.short_description,
        download_link: plugin.download_link,
        homepage: plugin.homepage,
      }));

      return {
        toolResult: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              info: result.info,
              plugins: mappedPlugins,
            }, null, 2)
          }]
        }
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error searching plugin repository: ${msg}` }] } };
    }
  },
  get_plugin_details: async (params) => {
    try {
      const response = await axios.post('https://api.wordpress.org/plugins/info/1.2/', {
        action: 'plugin_information',
        request: {
          slug: params.slug,
          fields: {
            description: true,
            sections: true,
            tested: true,
            requires: true,
            rating: true,
            ratings: true,
            downloaded: true,
            compatibility: true,
            banners: true,
            icons: true,
          },
        },
      });

      return { toolResult: { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] } };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      return { toolResult: { isError: true, content: [{ type: 'text', text: `Error getting plugin details: ${msg}` }] } };
    }
  },
};

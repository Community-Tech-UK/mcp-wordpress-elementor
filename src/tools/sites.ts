import { z } from 'zod';
import { listSites, selectSite } from '../wordpress.js';

const listSitesSchema = z.object({});

const selectSiteSchema = z.object({
  name: z.string(),
});

export const sitesTools = [
  {
    name: 'list_sites',
    description:
      'List all configured WordPress sites and show which one is currently active. Only available in multi-site mode.',
    inputSchema: {
      type: 'object' as const,
      properties: listSitesSchema.shape,
    },
  },
  {
    name: 'select_site',
    description:
      'Switch the active WordPress site. All subsequent tool calls will target the selected site. Use list_sites to see available sites.',
    inputSchema: {
      type: 'object' as const,
      properties: selectSiteSchema.shape,
      required: ['name'],
    },
  },
];

export const sitesHandlers: Record<string, (params: any) => Promise<any>> = {
  list_sites: async () => {
    const sites = listSites();
    return {
      toolResult: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { sites, total: sites.length },
              null,
              2
            ),
          },
        ],
        isError: false,
      },
    };
  },

  select_site: async (params) => {
    try {
      const { name } = params;
      await selectSite(name);
      const sites = listSites();
      const active = sites.find((s) => s.active);
      return {
        toolResult: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Switched to site "${name}"`,
                  active_site: active,
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        },
      };
    } catch (error: any) {
      return {
        toolResult: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }, null, 2),
            },
          ],
          isError: true,
        },
      };
    }
  },
};

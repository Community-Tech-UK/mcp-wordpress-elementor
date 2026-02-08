import { z } from 'zod';
import { CommunityTechClient } from '../utils/communitytech-client.js';
import { getBaseUrl, getWpClient } from '../wordpress.js';
import { toolSuccess, toolError } from '../types/elementor-types.js';

// Lazy-init client
let ctClient: CommunityTechClient | null = null;
function getClient(): CommunityTechClient {
  if (!ctClient) {
    ctClient = new CommunityTechClient(getBaseUrl(), getWpClient());
  }
  return ctClient;
}

// Schema definitions
const getSeoMetadataSchema = z.object({
  post_id: z.number(),
});

const updateSeoMetadataSchema = z.object({
  post_id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  target_keywords: z.string().optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  canonical: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().optional(),
});

const auditSeoSchema = z.object({
  post_type: z.string().optional(),
  per_page: z.number().optional(),
  page: z.number().optional(),
});

const getSeoSettingsSchema = z.object({});

// Tool definitions
export const siteseoTools = [
  {
    name: 'get_seo_metadata',
    description:
      'Get all SEO metadata fields for a post or page, including title, description, keywords, robots directives, Open Graph, Twitter Card, and redirect settings. Requires the CommunityTech plugin and SiteSEO to be active.',
    inputSchema: {
      type: 'object' as const,
      properties: getSeoMetadataSchema.shape,
      required: ['post_id'],
    },
  },
  {
    name: 'update_seo_metadata',
    description:
      'Update SEO metadata fields for a post or page. Provide any subset of fields to update: title, description, target_keywords, noindex, nofollow, canonical, og_title, og_description, og_image, twitter_title, twitter_description, twitter_image. Requires the CommunityTech plugin and SiteSEO to be active.',
    inputSchema: {
      type: 'object' as const,
      properties: updateSeoMetadataSchema.shape,
      required: ['post_id'],
    },
  },
  {
    name: 'audit_seo',
    description:
      'Audit SEO coverage across the site. Returns per-post summary of whether title, description, and keywords are set, plus aggregate counts. Useful for identifying pages missing SEO metadata. Requires the CommunityTech plugin and SiteSEO to be active.',
    inputSchema: {
      type: 'object' as const,
      properties: auditSeoSchema.shape,
    },
  },
  {
    name: 'get_seo_settings',
    description:
      'Read global SiteSEO configuration including title settings, social settings, feature toggles, and XML sitemap settings. Requires the CommunityTech plugin and SiteSEO to be active.',
    inputSchema: {
      type: 'object' as const,
      properties: getSeoSettingsSchema.shape,
    },
  },
];

// Handler implementations
export const siteseoHandlers: Record<string, (params: any) => Promise<any>> = {
  get_seo_metadata: async (params) => {
    try {
      const { post_id } = params;
      const data = await getClient().getSeoForPost(post_id);
      return toolSuccess(data);
    } catch (error: any) {
      return toolError(`Error fetching SEO metadata: ${error.message}`);
    }
  },

  update_seo_metadata: async (params) => {
    try {
      const { post_id, ...fields } = params;

      // Remove undefined values
      const cleanFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          cleanFields[key] = value;
        }
      }

      if (Object.keys(cleanFields).length === 0) {
        return toolError('At least one SEO field must be provided to update.');
      }

      const data = await getClient().updateSeoForPost(post_id, cleanFields);
      return toolSuccess(data);
    } catch (error: any) {
      return toolError(`Error updating SEO metadata: ${error.message}`);
    }
  },

  audit_seo: async (params) => {
    try {
      const data = await getClient().getSeoAudit(params);
      return toolSuccess(data);
    } catch (error: any) {
      return toolError(`Error running SEO audit: ${error.message}`);
    }
  },

  get_seo_settings: async (params) => {
    try {
      const data = await getClient().getSeoSettings();
      return toolSuccess(data);
    } catch (error: any) {
      return toolError(`Error fetching SEO settings: ${error.message}`);
    }
  },
};

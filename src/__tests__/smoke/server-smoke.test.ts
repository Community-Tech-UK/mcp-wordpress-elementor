import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WordPress module to avoid needing real credentials
vi.mock('../../wordpress.js', () => ({
  makeWordPressRequest: vi.fn(),
  initWordPress: vi.fn(),
  getBaseUrl: vi.fn(() => 'https://example.com'),
  getWpClient: vi.fn(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() })),
  searchWordPressPluginRepository: vi.fn(),
  logToFile: vi.fn(),
}));

describe('MCP Server Smoke Test', () => {
  describe('Server module loads', () => {
    it('should import allTools as array with length > 0', async () => {
      const { allTools } = await import('../../tools/index.js');

      expect(Array.isArray(allTools)).toBe(true);
      expect(allTools.length).toBeGreaterThan(0);
    });

    it('should import toolHandlers as object with keys', async () => {
      const { toolHandlers } = await import('../../tools/index.js');

      expect(typeof toolHandlers).toBe('object');
      expect(toolHandlers).not.toBeNull();
      expect(Object.keys(toolHandlers).length).toBeGreaterThan(0);
    });
  });

  describe('Tool count', () => {
    it('should have exactly 71 tools registered', async () => {
      const { allTools } = await import('../../tools/index.js');

      expect(allTools.length).toBe(71);
    });
  });

  describe('All tools have handlers', () => {
    it('should have a handler function for every tool', async () => {
      const { allTools, toolHandlers } = await import('../../tools/index.js');

      for (const tool of allTools) {
        expect(toolHandlers).toHaveProperty(tool.name);
        expect(typeof toolHandlers[tool.name]).toBe('function');
      }
    });
  });

  describe('No duplicate tool names', () => {
    it('should have unique tool names', async () => {
      const { allTools } = await import('../../tools/index.js');

      const toolNames = allTools.map(tool => tool.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });
  });

  describe('Tool categories', () => {
    it('should include all 36 WordPress tools', async () => {
      const { allTools } = await import('../../tools/index.js');

      const expectedWordPressTools = [
        'list_posts',
        'get_post',
        'create_post',
        'update_post',
        'delete_post',
        'list_pages',
        'get_page',
        'create_page',
        'update_page',
        'delete_page',
        'list_categories',
        'get_category',
        'create_category',
        'update_category',
        'delete_category',
        'list_comments',
        'get_comment',
        'create_comment',
        'update_comment',
        'delete_comment',
        'list_media',
        'create_media',
        'edit_media',
        'delete_media',
        'list_users',
        'get_user',
        'create_user',
        'update_user',
        'delete_user',
        'list_plugins',
        'get_plugin',
        'activate_plugin',
        'deactivate_plugin',
        'create_plugin',
        'search_plugin_repository',
        'get_plugin_details',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedWordPressTools) {
        expect(toolNames).toContain(expectedTool);
      }

      expect(expectedWordPressTools.length).toBe(36);
    });

    it('should include all 24 Elementor tools', async () => {
      const { allTools } = await import('../../tools/index.js');

      const expectedElementorTools = [
        'get_elementor_data',
        'update_elementor_data',
        'get_elementor_data_chunked',
        'backup_elementor_data',
        'get_elementor_templates',
        'get_page_structure',
        'get_elementor_elements',
        'create_elementor_section',
        'create_elementor_container',
        'add_column_to_section',
        'duplicate_section',
        'reorder_top_level_sections',
        'delete_elementor_element',
        'reorder_elements',
        'copy_element_settings',
        'find_elements_by_type',
        'add_widget_to_section',
        'insert_widget_at_position',
        'clone_widget',
        'move_widget',
        'update_elementor_widget',
        'get_elementor_widget',
        'update_elementor_section',
        'get_widget_content',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedElementorTools) {
        expect(toolNames).toContain(expectedTool);
      }

      expect(expectedElementorTools.length).toBe(24);
    });

    it('should include all 11 Global Settings tools', async () => {
      const { allTools } = await import('../../tools/index.js');

      const expectedGlobalSettingsTools = [
        'get_elementor_kit_settings',
        'get_elementor_global_colors',
        'update_elementor_global_colors',
        'get_elementor_global_fonts',
        'update_elementor_global_fonts',
        'get_elementor_theme_style',
        'update_elementor_theme_style',
        'get_elementor_css_variables',
        'clear_elementor_cache_by_page',
        'regenerate_elementor_css',
        'list_available_widgets',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedGlobalSettingsTools) {
        expect(toolNames).toContain(expectedTool);
      }

      expect(expectedGlobalSettingsTools.length).toBe(11);
    });

    it('should have 36 + 24 + 11 = 71 tools total', () => {
      expect(36 + 24 + 11).toBe(71);
    });
  });

  describe('Tool schema validation', () => {
    it('should have valid inputSchema for every tool', async () => {
      const { allTools } = await import('../../tools/index.js');

      for (const tool of allTools) {
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(typeof tool.inputSchema.properties).toBe('object');
        expect(tool.inputSchema.properties).not.toBeNull();
      }
    });

    it('should have properties as plain object for every tool', async () => {
      const { allTools } = await import('../../tools/index.js');

      for (const tool of allTools) {
        const { properties } = tool.inputSchema;
        expect(Object.prototype.toString.call(properties)).toBe('[object Object]');
      }
    });
  });

  describe('Feature flag filtering', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should have 47 tools when DISABLE_ELEMENTOR=true (WordPress + Global Settings)', async () => {
      vi.doMock('../../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: false,
          elementor_global_settings: true,
        }),
      }));

      vi.resetModules();
      const { allTools } = await import('../../tools/index.js');

      expect(allTools.length).toBe(47); // 36 WordPress + 11 Global Settings
    });

    it('should have 60 tools when DISABLE_ELEMENTOR_GLOBAL_SETTINGS=true (WordPress + Elementor)', async () => {
      vi.doMock('../../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: true,
          elementor_global_settings: false,
        }),
      }));

      vi.resetModules();
      const { allTools } = await import('../../tools/index.js');

      expect(allTools.length).toBe(60); // 36 WordPress + 24 Elementor
    });

    it('should have 36 tools when both Elementor flags disabled (WordPress only)', async () => {
      vi.doMock('../../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: false,
          elementor_global_settings: false,
        }),
      }));

      vi.resetModules();
      const { allTools } = await import('../../tools/index.js');

      expect(allTools.length).toBe(36); // 36 WordPress only
    });

    it('should not include Elementor page-building tools when elementor flag is false', async () => {
      vi.doMock('../../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: false,
          elementor_global_settings: true,
        }),
      }));

      vi.resetModules();
      const { allTools } = await import('../../tools/index.js');

      const toolNames = allTools.map(tool => tool.name);

      expect(toolNames).not.toContain('get_elementor_data');
      expect(toolNames).not.toContain('create_elementor_section');
      expect(toolNames).not.toContain('add_widget_to_section');
    });

    it('should not include global settings tools when elementor_global_settings flag is false', async () => {
      vi.doMock('../../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: true,
          elementor_global_settings: false,
        }),
      }));

      vi.resetModules();
      const { allTools } = await import('../../tools/index.js');

      const toolNames = allTools.map(tool => tool.name);

      expect(toolNames).not.toContain('get_elementor_kit_settings');
      expect(toolNames).not.toContain('get_elementor_global_colors');
      expect(toolNames).not.toContain('regenerate_elementor_css');
    });
  });
});

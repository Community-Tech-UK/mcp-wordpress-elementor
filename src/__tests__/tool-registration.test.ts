import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Tool Registration System', () => {
  beforeEach(() => {
    // Reset modules before each test to ensure clean state
    vi.resetModules();
  });

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  describe('All tools load correctly', () => {
    it('should load allTools array with length > 60', async () => {
      const { allTools } = await import('../tools/index.js');
      expect(Array.isArray(allTools)).toBe(true);
      expect(allTools.length).toBeGreaterThan(60);
    });

    it('should have valid schema for every tool', async () => {
      const { allTools } = await import('../tools/index.js');

      for (const tool of allTools) {
        expect(tool).toHaveProperty('name');
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);

        expect(tool).toHaveProperty('description');
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);

        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(typeof tool.inputSchema.properties).toBe('object');
      }
    });

    it('should have matching handler for every tool', async () => {
      const { allTools, toolHandlers } = await import('../tools/index.js');

      for (const tool of allTools) {
        expect(toolHandlers).toHaveProperty(tool.name);
        expect(typeof toolHandlers[tool.name]).toBe('function');
      }
    });

    it('should have all handlers as functions', async () => {
      const { toolHandlers } = await import('../tools/index.js');

      const handlers = Object.values(toolHandlers);
      expect(handlers.length).toBeGreaterThan(0);

      for (const handler of handlers) {
        expect(typeof handler).toBe('function');
      }
    });
  });

  describe('No duplicate tool names', () => {
    it('should have unique tool names', async () => {
      const { allTools } = await import('../tools/index.js');

      const toolNames = allTools.map(tool => tool.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });
  });

  describe('Feature flag filtering', () => {
    it('should exclude elementor tools when elementor flag is false', async () => {
      // Mock the feature flags module
      vi.doMock('../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: false,
          elementor_global_settings: false,
        }),
      }));

      // Reset modules to reload with mocked flags
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const elementorToolNames = [
        'get_elementor_data',
        'update_elementor_data',
        'get_page_structure',
        'get_elementor_elements',
        'create_elementor_section',
        'create_elementor_container',
        'add_widget_to_section',
        'update_elementor_widget',
        'get_elementor_widget',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const elementorTool of elementorToolNames) {
        expect(toolNames).not.toContain(elementorTool);
      }
    });

    it('should exclude global settings tools when elementor_global_settings flag is false', async () => {
      // Mock the feature flags module
      vi.doMock('../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: true,
          elementor_global_settings: false,
        }),
      }));

      // Reset modules to reload with mocked flags
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const globalSettingsToolNames = [
        'get_elementor_kit_settings',
        'get_elementor_global_colors',
        'update_elementor_global_colors',
        'get_elementor_global_fonts',
        'update_elementor_global_fonts',
        'get_elementor_theme_style',
        'update_elementor_theme_style',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const globalSettingsTool of globalSettingsToolNames) {
        expect(toolNames).not.toContain(globalSettingsTool);
      }
    });

    it('should include all tool groups when all flags are true', async () => {
      // Mock the feature flags module
      vi.doMock('../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: true,
          elementor_global_settings: true,
        }),
      }));

      // Reset modules to reload with mocked flags
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const toolNames = allTools.map(tool => tool.name);

      // WordPress tools should be present
      expect(toolNames).toContain('list_posts');
      expect(toolNames).toContain('list_pages');

      // Elementor tools should be present
      expect(toolNames).toContain('get_elementor_data');
      expect(toolNames).toContain('create_elementor_section');

      // Global settings tools should be present
      expect(toolNames).toContain('get_elementor_kit_settings');
      expect(toolNames).toContain('get_elementor_global_colors');
    });
  });

  describe('Tool categories', () => {
    beforeEach(() => {
      // Ensure all flags are enabled for category tests
      vi.doMock('../config/feature-flags.js', () => ({
        getFeatureFlags: () => ({
          wordpress: true,
          elementor: true,
          elementor_global_settings: true,
        }),
      }));
    });

    it('should include WordPress CRUD tools', async () => {
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const expectedTools = [
        'list_posts',
        'get_post',
        'create_post',
        'update_post',
        'delete_post',
        'list_pages',
        'list_media',
        'list_users',
        'list_comments',
        'list_categories',
        'list_plugins',
        'search_plugin_repository',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });

    it('should include Elementor core tools', async () => {
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const expectedTools = [
        'get_elementor_data',
        'update_elementor_data',
        'get_page_structure',
        'get_elementor_elements',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });

    it('should include Elementor sections tools', async () => {
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const expectedTools = [
        'create_elementor_section',
        'create_elementor_container',
        'duplicate_section',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });

    it('should include Elementor widgets tools', async () => {
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const expectedTools = [
        'add_widget_to_section',
        'update_elementor_widget',
        'get_elementor_widget',
        'clone_widget',
        'move_widget',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });

    it('should include Elementor elements tools', async () => {
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const expectedTools = [
        'delete_elementor_element',
        'reorder_elements',
        'copy_element_settings',
        'find_elements_by_type',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });

    it('should include global settings tools', async () => {
      vi.resetModules();
      const { allTools } = await import('../tools/index.js');

      const expectedTools = [
        'get_elementor_kit_settings',
        'get_elementor_global_colors',
        'update_elementor_global_colors',
      ];

      const toolNames = allTools.map(tool => tool.name);

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });
  });

  describe('Tool handler consistency', () => {
    it('should have exact same keys in allTools and toolHandlers', async () => {
      const { allTools, toolHandlers } = await import('../tools/index.js');

      const toolNames = allTools.map(tool => tool.name);
      const handlerNames = Object.keys(toolHandlers);

      // Every tool should have a handler
      for (const toolName of toolNames) {
        expect(handlerNames).toContain(toolName);
      }

      // Every handler should have a corresponding tool
      for (const handlerName of handlerNames) {
        expect(toolNames).toContain(handlerName);
      }
    });
  });
});

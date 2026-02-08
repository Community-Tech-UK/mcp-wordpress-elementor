import { describe, it, expect } from 'vitest';
import { generateElementId, reassignElementIds } from '../utils/id-generator.js';
import { ElementorElement } from '../types/elementor-types.js';

describe('id-generator', () => {
  describe('generateElementId', () => {
    it('should return 8-character string', () => {
      const id = generateElementId();
      expect(id).toHaveLength(8);
      expect(typeof id).toBe('string');
    });

    it('should return alphanumeric characters', () => {
      const id = generateElementId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique IDs across multiple calls', () => {
      const ids = new Set<string>();
      // Generate 100 IDs to check for uniqueness
      for (let i = 0; i < 100; i++) {
        ids.add(generateElementId());
      }
      // Allow for some collision in a random generator, but expect high uniqueness
      expect(ids.size).toBeGreaterThan(95);
    });

    it('should generate different IDs on subsequent calls', () => {
      const id1 = generateElementId();
      const id2 = generateElementId();
      const id3 = generateElementId();
      // While theoretically could be equal, extremely unlikely
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });
  });

  describe('reassignElementIds', () => {
    it('should replace ID on single element', () => {
      const original: ElementorElement = {
        id: 'original',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Test' },
        elements: [],
      };

      const cloned = reassignElementIds(original);

      expect(cloned.id).not.toBe('original');
      expect(cloned.id).toHaveLength(8);
      expect(cloned.elType).toBe('widget');
      expect(cloned.widgetType).toBe('heading');
      expect(cloned.settings.title).toBe('Test');
    });

    it('should deeply replace all IDs in nested structure', () => {
      const original: ElementorElement = {
        id: 'sec1',
        elType: 'section',
        settings: {},
        elements: [
          {
            id: 'col1',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'w1',
                elType: 'widget',
                widgetType: 'heading',
                settings: { title: 'Hello' },
                elements: [],
              },
              {
                id: 'w2',
                elType: 'widget',
                widgetType: 'text-editor',
                settings: { editor: 'World' },
                elements: [],
              },
            ],
          },
        ],
      };

      const cloned = reassignElementIds(original);

      // Top level ID changed
      expect(cloned.id).not.toBe('sec1');
      expect(cloned.id).toHaveLength(8);

      // Nested IDs changed
      expect(cloned.elements[0].id).not.toBe('col1');
      expect(cloned.elements[0].id).toHaveLength(8);
      expect(cloned.elements[0].elements[0].id).not.toBe('w1');
      expect(cloned.elements[0].elements[0].id).toHaveLength(8);
      expect(cloned.elements[0].elements[1].id).not.toBe('w2');
      expect(cloned.elements[0].elements[1].id).toHaveLength(8);

      // All IDs should be different from each other
      const allIds = [
        cloned.id,
        cloned.elements[0].id,
        cloned.elements[0].elements[0].id,
        cloned.elements[0].elements[1].id,
      ];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(4);
    });

    it('should preserve all non-ID properties', () => {
      const original: ElementorElement = {
        id: 'test',
        elType: 'container',
        isInner: true,
        settings: { background_color: '#fff', padding: '20px' },
        elements: [
          {
            id: 'child',
            elType: 'widget',
            widgetType: 'button',
            settings: { text: 'Click me' },
            elements: [],
          },
        ],
      };

      const cloned = reassignElementIds(original);

      expect(cloned.elType).toBe('container');
      expect(cloned.isInner).toBe(true);
      expect(cloned.settings.background_color).toBe('#fff');
      expect(cloned.settings.padding).toBe('20px');
      expect(cloned.elements[0].elType).toBe('widget');
      expect(cloned.elements[0].widgetType).toBe('button');
      expect(cloned.elements[0].settings.text).toBe('Click me');
    });

    it('should ensure original IDs are no longer present', () => {
      const original: ElementorElement = {
        id: 'parent123',
        elType: 'section',
        settings: {},
        elements: [
          {
            id: 'child456',
            elType: 'widget',
            widgetType: 'heading',
            settings: {},
            elements: [],
          },
        ],
      };

      const cloned = reassignElementIds(original);

      expect(cloned.id).not.toBe('parent123');
      expect(cloned.elements[0].id).not.toBe('child456');
    });

    it('should handle empty elements array', () => {
      const original: ElementorElement = {
        id: 'empty',
        elType: 'column',
        settings: {},
        elements: [],
      };

      const cloned = reassignElementIds(original);

      expect(cloned.id).not.toBe('empty');
      expect(cloned.elements).toEqual([]);
    });

    it('should not mutate original element', () => {
      const original: ElementorElement = {
        id: 'original',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Test' },
        elements: [],
      };

      const originalId = original.id;
      reassignElementIds(original);

      expect(original.id).toBe(originalId);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  traverseElements,
  findElementById,
  findElementParent,
  filterElements,
  findWidgetsByType,
  flattenElements,
} from '../utils/element-traversal.js';
import { ElementorElement } from '../types/elementor-types.js';

// Mock data representing a typical Elementor structure
const mockData: ElementorElement[] = [
  {
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
  },
  {
    id: 'cont1',
    elType: 'container',
    settings: {},
    elements: [
      {
        id: 'w3',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Hi' },
        elements: [],
      },
    ],
  },
];

describe('element-traversal', () => {
  describe('traverseElements', () => {
    it('should visit elements in depth-first order', () => {
      const visited: string[] = [];
      traverseElements(mockData, (el) => {
        visited.push(el.id);
      });
      expect(visited).toEqual(['sec1', 'col1', 'w1', 'w2', 'cont1', 'w3']);
    });

    it('should track depth correctly', () => {
      const depths: Array<{ id: string; depth: number }> = [];
      traverseElements(mockData, (el, depth) => {
        depths.push({ id: el.id, depth });
      });
      expect(depths).toEqual([
        { id: 'sec1', depth: 0 },
        { id: 'col1', depth: 1 },
        { id: 'w1', depth: 2 },
        { id: 'w2', depth: 2 },
        { id: 'cont1', depth: 0 },
        { id: 'w3', depth: 1 },
      ]);
    });

    it('should stop early when visitor returns true', () => {
      const visited: string[] = [];
      const stopped = traverseElements(mockData, (el) => {
        visited.push(el.id);
        if (el.id === 'col1') return true;
      });
      expect(stopped).toBe(true);
      expect(visited).toEqual(['sec1', 'col1']);
    });

    it('should return false when traversal completes', () => {
      const stopped = traverseElements(mockData, () => {});
      expect(stopped).toBe(false);
    });
  });

  describe('findElementById', () => {
    it('should find top-level element', () => {
      const element = findElementById(mockData, 'sec1');
      expect(element).toBeDefined();
      expect(element?.id).toBe('sec1');
      expect(element?.elType).toBe('section');
    });

    it('should find nested element', () => {
      const element = findElementById(mockData, 'w2');
      expect(element).toBeDefined();
      expect(element?.id).toBe('w2');
      expect(element?.widgetType).toBe('text-editor');
    });

    it('should find deeply nested element', () => {
      const element = findElementById(mockData, 'w1');
      expect(element).toBeDefined();
      expect(element?.id).toBe('w1');
      expect(element?.widgetType).toBe('heading');
    });

    it('should return undefined for non-existent id', () => {
      const element = findElementById(mockData, 'nonexistent');
      expect(element).toBeUndefined();
    });
  });

  describe('findElementParent', () => {
    it('should return parent null for top-level element', () => {
      const result = findElementParent(mockData, 'sec1');
      expect(result).toBeDefined();
      expect(result?.parent).toBeNull();
      expect(result?.index).toBe(0);
    });

    it('should return parent null for second top-level element', () => {
      const result = findElementParent(mockData, 'cont1');
      expect(result).toBeDefined();
      expect(result?.parent).toBeNull();
      expect(result?.index).toBe(1);
    });

    it('should return parent and index for nested element', () => {
      const result = findElementParent(mockData, 'col1');
      expect(result).toBeDefined();
      expect(result?.parent?.id).toBe('sec1');
      expect(result?.index).toBe(0);
    });

    it('should return parent and index for deeply nested element', () => {
      const result = findElementParent(mockData, 'w2');
      expect(result).toBeDefined();
      expect(result?.parent?.id).toBe('col1');
      expect(result?.index).toBe(1);
    });

    it('should return undefined for non-existent id', () => {
      const result = findElementParent(mockData, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('filterElements', () => {
    it('should filter by predicate', () => {
      const widgets = filterElements(mockData, (el) => el.elType === 'widget');
      expect(widgets).toHaveLength(3);
      expect(widgets.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
    });

    it('should filter by settings', () => {
      const headings = filterElements(
        mockData,
        (el) => el.settings.title === 'Hello'
      );
      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('w1');
    });

    it('should return empty array when no matches', () => {
      const result = filterElements(mockData, () => false);
      expect(result).toEqual([]);
    });

    it('should return all elements when predicate always true', () => {
      const all = filterElements(mockData, () => true);
      expect(all).toHaveLength(6);
    });
  });

  describe('findWidgetsByType', () => {
    it('should find widgets by type', () => {
      const headings = findWidgetsByType(mockData, 'heading');
      expect(headings).toHaveLength(2);
      expect(headings.map((h) => h.id)).toEqual(['w1', 'w3']);
    });

    it('should find single widget type', () => {
      const editors = findWidgetsByType(mockData, 'text-editor');
      expect(editors).toHaveLength(1);
      expect(editors[0].id).toBe('w2');
    });

    it('should return empty array for non-existent widget type', () => {
      const result = findWidgetsByType(mockData, 'button');
      expect(result).toEqual([]);
    });

    it('should not match non-widget elements', () => {
      const sections = findWidgetsByType(mockData, 'section');
      expect(sections).toEqual([]);
    });
  });

  describe('flattenElements', () => {
    it('should flatten tree with correct depth tracking', () => {
      const flattened = flattenElements(mockData);
      expect(flattened).toHaveLength(6);
      expect(flattened.map((item) => ({ id: item.element.id, depth: item.depth }))).toEqual([
        { id: 'sec1', depth: 0 },
        { id: 'col1', depth: 1 },
        { id: 'w1', depth: 2 },
        { id: 'w2', depth: 2 },
        { id: 'cont1', depth: 0 },
        { id: 'w3', depth: 1 },
      ]);
    });

    it('should handle empty array', () => {
      const flattened = flattenElements([]);
      expect(flattened).toEqual([]);
    });

    it('should handle single element with no children', () => {
      const singleElement: ElementorElement[] = [
        {
          id: 'single',
          elType: 'widget',
          widgetType: 'heading',
          settings: {},
          elements: [],
        },
      ];
      const flattened = flattenElements(singleElement);
      expect(flattened).toHaveLength(1);
      expect(flattened[0]).toEqual({
        element: singleElement[0],
        depth: 0,
      });
    });
  });
});

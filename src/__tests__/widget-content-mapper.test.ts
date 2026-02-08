import { describe, it, expect } from 'vitest';
import {
  WIDGET_CONTENT_FIELDS,
  getWidgetContentField,
  getWidgetContent,
  setWidgetContent,
} from '../utils/widget-content-mapper.js';
import { ElementorElement } from '../types/elementor-types.js';

describe('widget-content-mapper', () => {
  describe('WIDGET_CONTENT_FIELDS', () => {
    it('should contain common widget types', () => {
      expect(WIDGET_CONTENT_FIELDS['heading']).toBe('title');
      expect(WIDGET_CONTENT_FIELDS['text-editor']).toBe('editor');
      expect(WIDGET_CONTENT_FIELDS['html']).toBe('html');
      expect(WIDGET_CONTENT_FIELDS['button']).toBe('text');
    });

    it('should have correct field mappings', () => {
      expect(WIDGET_CONTENT_FIELDS['icon-box']).toBe('title_text');
      expect(WIDGET_CONTENT_FIELDS['call-to-action']).toBe('title');
      expect(WIDGET_CONTENT_FIELDS['testimonial']).toBe('testimonial_content');
      expect(WIDGET_CONTENT_FIELDS['tabs']).toBe('tabs');
    });
  });

  describe('getWidgetContentField', () => {
    it('should return correct field for known widget types', () => {
      expect(getWidgetContentField('heading')).toBe('title');
      expect(getWidgetContentField('text-editor')).toBe('editor');
      expect(getWidgetContentField('button')).toBe('text');
      expect(getWidgetContentField('html')).toBe('html');
    });

    it('should return undefined for unknown widget types', () => {
      expect(getWidgetContentField('unknown-widget')).toBeUndefined();
      expect(getWidgetContentField('custom-element')).toBeUndefined();
    });

    it('should handle all mapped widget types', () => {
      expect(getWidgetContentField('icon-box')).toBe('title_text');
      expect(getWidgetContentField('image-box')).toBe('title_text');
      expect(getWidgetContentField('call-to-action')).toBe('title');
      expect(getWidgetContentField('testimonial')).toBe('testimonial_content');
      expect(getWidgetContentField('counter')).toBe('title');
      expect(getWidgetContentField('progress-bar')).toBe('title');
      expect(getWidgetContentField('tabs')).toBe('tabs');
      expect(getWidgetContentField('accordion')).toBe('tabs');
      expect(getWidgetContentField('toggle')).toBe('tabs');
      expect(getWidgetContentField('alert')).toBe('alert_title');
      expect(getWidgetContentField('price-table')).toBe('heading');
      expect(getWidgetContentField('price-list')).toBe('price_list');
    });
  });

  describe('getWidgetContent', () => {
    it('should extract content from heading widget', () => {
      const widget: ElementorElement = {
        id: 'w1',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Hello World' },
        elements: [],
      };

      expect(getWidgetContent(widget)).toBe('Hello World');
    });

    it('should extract content from text-editor widget', () => {
      const widget: ElementorElement = {
        id: 'w2',
        elType: 'widget',
        widgetType: 'text-editor',
        settings: { editor: '<p>Rich text content</p>' },
        elements: [],
      };

      expect(getWidgetContent(widget)).toBe('<p>Rich text content</p>');
    });

    it('should extract content from button widget', () => {
      const widget: ElementorElement = {
        id: 'w3',
        elType: 'widget',
        widgetType: 'button',
        settings: { text: 'Click Me' },
        elements: [],
      };

      expect(getWidgetContent(widget)).toBe('Click Me');
    });

    it('should return undefined for widget without widgetType', () => {
      const widget: ElementorElement = {
        id: 'w4',
        elType: 'widget',
        settings: { title: 'Test' },
        elements: [],
      };

      expect(getWidgetContent(widget)).toBeUndefined();
    });

    it('should return undefined for unknown widget type', () => {
      const widget: ElementorElement = {
        id: 'w5',
        elType: 'widget',
        widgetType: 'unknown-widget',
        settings: { content: 'Some content' },
        elements: [],
      };

      expect(getWidgetContent(widget)).toBeUndefined();
    });

    it('should return undefined if content field is missing', () => {
      const widget: ElementorElement = {
        id: 'w6',
        elType: 'widget',
        widgetType: 'heading',
        settings: { other_field: 'value' },
        elements: [],
      };

      expect(getWidgetContent(widget)).toBeUndefined();
    });

    it('should handle complex content types', () => {
      const widget: ElementorElement = {
        id: 'w7',
        elType: 'widget',
        widgetType: 'tabs',
        settings: {
          tabs: [
            { tab_title: 'Tab 1', tab_content: 'Content 1' },
            { tab_title: 'Tab 2', tab_content: 'Content 2' },
          ],
        },
        elements: [],
      };

      const content = getWidgetContent(widget);
      expect(content).toEqual([
        { tab_title: 'Tab 1', tab_content: 'Content 1' },
        { tab_title: 'Tab 2', tab_content: 'Content 2' },
      ]);
    });
  });

  describe('setWidgetContent', () => {
    it('should set content on heading widget', () => {
      const widget: ElementorElement = {
        id: 'w1',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Old Title' },
        elements: [],
      };

      const result = setWidgetContent(widget, 'New Title');

      expect(result).toBe(true);
      expect(widget.settings.title).toBe('New Title');
    });

    it('should set content on text-editor widget', () => {
      const widget: ElementorElement = {
        id: 'w2',
        elType: 'widget',
        widgetType: 'text-editor',
        settings: { editor: 'Old content' },
        elements: [],
      };

      const result = setWidgetContent(widget, '<p>New content</p>');

      expect(result).toBe(true);
      expect(widget.settings.editor).toBe('<p>New content</p>');
    });

    it('should set content on button widget', () => {
      const widget: ElementorElement = {
        id: 'w3',
        elType: 'widget',
        widgetType: 'button',
        settings: { text: 'Old Button' },
        elements: [],
      };

      const result = setWidgetContent(widget, 'New Button');

      expect(result).toBe(true);
      expect(widget.settings.text).toBe('New Button');
    });

    it('should return false for widget without widgetType', () => {
      const widget: ElementorElement = {
        id: 'w4',
        elType: 'widget',
        settings: { title: 'Test' },
        elements: [],
      };

      const result = setWidgetContent(widget, 'New Content');

      expect(result).toBe(false);
      expect(widget.settings.title).toBe('Test');
    });

    it('should return false for unknown widget type', () => {
      const widget: ElementorElement = {
        id: 'w5',
        elType: 'widget',
        widgetType: 'unknown-widget',
        settings: { content: 'Old' },
        elements: [],
      };

      const result = setWidgetContent(widget, 'New');

      expect(result).toBe(false);
      expect(widget.settings.content).toBe('Old');
    });

    it('should create field if it does not exist', () => {
      const widget: ElementorElement = {
        id: 'w6',
        elType: 'widget',
        widgetType: 'heading',
        settings: { other_field: 'value' },
        elements: [],
      };

      const result = setWidgetContent(widget, 'New Title');

      expect(result).toBe(true);
      expect(widget.settings.title).toBe('New Title');
      expect(widget.settings.other_field).toBe('value');
    });

    it('should mutate widget in place', () => {
      const widget: ElementorElement = {
        id: 'w7',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Original' },
        elements: [],
      };

      const originalWidget = widget;
      setWidgetContent(widget, 'Modified');

      expect(originalWidget.settings.title).toBe('Modified');
      expect(originalWidget).toBe(widget);
    });

    it('should handle empty string content', () => {
      const widget: ElementorElement = {
        id: 'w8',
        elType: 'widget',
        widgetType: 'text-editor',
        settings: { editor: 'Original content' },
        elements: [],
      };

      const result = setWidgetContent(widget, '');

      expect(result).toBe(true);
      expect(widget.settings.editor).toBe('');
    });

    it('should handle all mapped widget types', () => {
      const widgets = [
        { type: 'icon-box', field: 'title_text' },
        { type: 'testimonial', field: 'testimonial_content' },
        { type: 'counter', field: 'title' },
        { type: 'alert', field: 'alert_title' },
      ];

      widgets.forEach(({ type, field }) => {
        const widget: ElementorElement = {
          id: `w-${type}`,
          elType: 'widget',
          widgetType: type,
          settings: {},
          elements: [],
        };

        const result = setWidgetContent(widget, 'Test Content');

        expect(result).toBe(true);
        expect(widget.settings[field]).toBe('Test Content');
      });
    });
  });
});

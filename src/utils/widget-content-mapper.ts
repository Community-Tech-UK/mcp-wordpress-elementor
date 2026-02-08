import { ElementorElement } from '../types/elementor-types.js';

/** Map of widget type → the settings key that holds its primary content. */
export const WIDGET_CONTENT_FIELDS: Record<string, string> = {
  heading: 'title',
  'text-editor': 'editor',
  html: 'html',
  button: 'text',
  'icon-box': 'title_text',
  'image-box': 'title_text',
  'call-to-action': 'title',
  testimonial: 'testimonial_content',
  counter: 'title',
  'progress-bar': 'title',
  tabs: 'tabs',
  accordion: 'tabs',
  toggle: 'tabs',
  alert: 'alert_title',
  'price-table': 'heading',
  'price-list': 'price_list',
};

/** Get the settings key for a widget's primary content field. */
export function getWidgetContentField(widgetType: string): string | undefined {
  return WIDGET_CONTENT_FIELDS[widgetType];
}

/** Extract the primary text content from a widget. */
export function getWidgetContent(widget: ElementorElement): string | undefined {
  if (!widget.widgetType) return undefined;
  const field = WIDGET_CONTENT_FIELDS[widget.widgetType];
  return field ? widget.settings[field] : undefined;
}

/** Set the primary text content on a widget. */
export function setWidgetContent(widget: ElementorElement, content: string): boolean {
  if (!widget.widgetType) return false;
  const field = WIDGET_CONTENT_FIELDS[widget.widgetType];
  if (!field) return false;
  widget.settings[field] = content;
  return true;
}

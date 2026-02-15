import { makeWordPressRequest } from '../wordpress.js';
import { ElementorElement } from '../types/elementor-types.js';

const SEPARATOR = '--- Elementor Data ---\n';

/** Parse Elementor data from the raw response text. */
function parseElementorResponse(text: string): ElementorElement[] {
  // The response may be a plain JSON array or may contain a debug preamble
  const separatorIndex = text.indexOf(SEPARATOR);
  const jsonPart = separatorIndex !== -1
    ? text.substring(separatorIndex + SEPARATOR.length)
    : text;
  return JSON.parse(jsonPart);
}

/** Fetch and parse _elementor_data for a post/page/template. */
export async function fetchElementorData(
  postId: number
): Promise<ElementorElement[]> {
  // Try as post first, fall back to page, then elementor_library template
  let response: any;
  try {
    response = await makeWordPressRequest('GET', `posts/${postId}`, { context: 'edit' }, { rawResponse: true });
  } catch {
    try {
      response = await makeWordPressRequest('GET', `pages/${postId}`, { context: 'edit' }, { rawResponse: true });
    } catch {
      try {
        response = await makeWordPressRequest('GET', `elementor_library/${postId}`, { context: 'edit' }, { rawResponse: true });
      } catch {
        throw new Error(`Could not find post, page, or template with ID ${postId}`);
      }
    }
  }

  const post = response.data ?? response;
  const elementorDataRaw = post.meta?._elementor_data;

  if (!elementorDataRaw) {
    throw new Error(`No _elementor_data found for post/page ${postId}. Is Elementor enabled on this content?`);
  }

  // Handle string or already-parsed data
  if (typeof elementorDataRaw === 'string') {
    try {
      return parseElementorResponse(elementorDataRaw);
    } catch {
      throw new Error(`Failed to parse _elementor_data for post ${postId}`);
    }
  }

  return elementorDataRaw as ElementorElement[];
}

/** Save _elementor_data back to a post/page/template. */
export async function saveElementorData(
  postId: number,
  data: ElementorElement[]
): Promise<void> {
  const payload = { meta: { _elementor_data: JSON.stringify(data) } };

  // Try as post first, fall back to page, then elementor_library template
  try {
    await makeWordPressRequest('POST', `posts/${postId}`, payload);
  } catch {
    try {
      await makeWordPressRequest('POST', `pages/${postId}`, payload);
    } catch {
      try {
        await makeWordPressRequest('POST', `elementor_library/${postId}`, payload);
      } catch {
        throw new Error(`Failed to save Elementor data for post/page/template ${postId}`);
      }
    }
  }
}

/**
 * Fetch Elementor data, apply a mutator function, and save back.
 * This is the key convenience pattern — tools just supply the mutation logic.
 * The mutator can return any value (which is passed through to the caller).
 * The original elements array (mutated in place) is always saved.
 */
export async function withElementorData<T>(
  postId: number,
  mutator: (elements: ElementorElement[]) => T
): Promise<T> {
  const elements = await fetchElementorData(postId);
  const result = mutator(elements);
  await saveElementorData(postId, elements);
  return result;
}

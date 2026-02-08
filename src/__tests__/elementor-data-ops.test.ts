import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchElementorData, saveElementorData, withElementorData } from '../utils/elementor-data-ops.js';
import { ElementorElement } from '../types/elementor-types.js';

// Mock the wordpress module
vi.mock('../wordpress.js', () => ({
  makeWordPressRequest: vi.fn(),
}));

import { makeWordPressRequest } from '../wordpress.js';

const mockElementorData: ElementorElement[] = [
  {
    id: 'sec1',
    elType: 'section',
    settings: { background_color: '#fff' },
    elements: [
      {
        id: 'w1',
        elType: 'widget',
        widgetType: 'heading',
        settings: { title: 'Test' },
        elements: [],
      },
    ],
  },
];

describe('elementor-data-ops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchElementorData', () => {
    it('should fetch and parse elementor data from post', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce(mockResponse);

      const result = await fetchElementorData(123);

      expect(makeWordPressRequest).toHaveBeenCalledWith(
        'GET',
        'posts/123',
        { context: 'edit' },
        { rawResponse: true }
      );
      expect(result).toEqual(mockElementorData);
    });

    it('should fall back to page if post fails', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest)
        .mockRejectedValueOnce(new Error('Not a post'))
        .mockResolvedValueOnce(mockResponse);

      const result = await fetchElementorData(456);

      expect(makeWordPressRequest).toHaveBeenCalledTimes(2);
      expect(makeWordPressRequest).toHaveBeenNthCalledWith(
        1,
        'GET',
        'posts/456',
        { context: 'edit' },
        { rawResponse: true }
      );
      expect(makeWordPressRequest).toHaveBeenNthCalledWith(
        2,
        'GET',
        'pages/456',
        { context: 'edit' },
        { rawResponse: true }
      );
      expect(result).toEqual(mockElementorData);
    });

    it('should handle response wrapped in data property', async () => {
      const mockResponse = {
        data: {
          meta: {
            _elementor_data: JSON.stringify(mockElementorData),
          },
        },
      };

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce(mockResponse);

      const result = await fetchElementorData(789);

      expect(result).toEqual(mockElementorData);
    });

    it('should handle elementor data with debug preamble', async () => {
      const mockResponseWithPreamble = {
        meta: {
          _elementor_data: 'Debug info here\n--- Elementor Data ---\n' + JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce(mockResponseWithPreamble);

      const result = await fetchElementorData(123);

      expect(result).toEqual(mockElementorData);
    });

    it('should handle already-parsed data', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: mockElementorData,
        },
      };

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce(mockResponse);

      const result = await fetchElementorData(123);

      expect(result).toEqual(mockElementorData);
    });

    it('should throw error when both post and page fail', async () => {
      vi.mocked(makeWordPressRequest)
        .mockRejectedValueOnce(new Error('Post not found'))
        .mockRejectedValueOnce(new Error('Page not found'));

      await expect(fetchElementorData(999)).rejects.toThrow(
        'Could not find post or page with ID 999'
      );
    });

    it('should throw error when no elementor data found', async () => {
      const mockResponse = {
        meta: {},
      };

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce(mockResponse);

      await expect(fetchElementorData(123)).rejects.toThrow(
        'No _elementor_data found for post/page 123'
      );
    });

    it('should throw error when elementor data is invalid JSON', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: 'invalid json {',
        },
      };

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce(mockResponse);

      await expect(fetchElementorData(123)).rejects.toThrow(
        'Failed to parse _elementor_data for post 123'
      );
    });
  });

  describe('saveElementorData', () => {
    it('should save elementor data to post', async () => {
      vi.mocked(makeWordPressRequest).mockResolvedValueOnce({});

      await saveElementorData(123, mockElementorData);

      expect(makeWordPressRequest).toHaveBeenCalledWith(
        'POST',
        'posts/123',
        { meta: { _elementor_data: JSON.stringify(mockElementorData) } }
      );
    });

    it('should fall back to page if post fails', async () => {
      vi.mocked(makeWordPressRequest)
        .mockRejectedValueOnce(new Error('Not a post'))
        .mockResolvedValueOnce({});

      await saveElementorData(456, mockElementorData);

      expect(makeWordPressRequest).toHaveBeenCalledTimes(2);
      expect(makeWordPressRequest).toHaveBeenNthCalledWith(
        1,
        'POST',
        'posts/456',
        { meta: { _elementor_data: JSON.stringify(mockElementorData) } }
      );
      expect(makeWordPressRequest).toHaveBeenNthCalledWith(
        2,
        'POST',
        'pages/456',
        { meta: { _elementor_data: JSON.stringify(mockElementorData) } }
      );
    });

    it('should throw error when both post and page fail', async () => {
      vi.mocked(makeWordPressRequest)
        .mockRejectedValueOnce(new Error('Post save failed'))
        .mockRejectedValueOnce(new Error('Page save failed'));

      await expect(saveElementorData(999, mockElementorData)).rejects.toThrow(
        'Failed to save Elementor data for post/page 999'
      );
    });

    it('should stringify data correctly', async () => {
      const data: ElementorElement[] = [
        {
          id: 'test',
          elType: 'widget',
          widgetType: 'button',
          settings: { text: 'Click' },
          elements: [],
        },
      ];

      vi.mocked(makeWordPressRequest).mockResolvedValueOnce({});

      await saveElementorData(123, data);

      expect(makeWordPressRequest).toHaveBeenCalledWith(
        'POST',
        'posts/123',
        { meta: { _elementor_data: JSON.stringify(data) } }
      );
    });
  });

  describe('withElementorData', () => {
    it('should fetch, mutate, and save data', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest)
        .mockResolvedValueOnce(mockResponse) // fetch
        .mockResolvedValueOnce({}); // save

      const mutator = vi.fn((elements: ElementorElement[]) => {
        elements[0].settings.background_color = '#000';
        return 'mutation result';
      });

      const result = await withElementorData(123, mutator);

      expect(result).toBe('mutation result');
      expect(mutator).toHaveBeenCalledTimes(1);
      expect(mutator).toHaveBeenCalledWith(expect.any(Array));
      expect(makeWordPressRequest).toHaveBeenCalledTimes(2);
      expect(makeWordPressRequest).toHaveBeenNthCalledWith(
        1,
        'GET',
        'posts/123',
        { context: 'edit' },
        { rawResponse: true }
      );
      expect(makeWordPressRequest).toHaveBeenNthCalledWith(
        2,
        'POST',
        'posts/123',
        expect.objectContaining({
          meta: expect.objectContaining({
            _elementor_data: expect.any(String),
          }),
        })
      );
    });

    it('should save mutated elements array', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({});

      await withElementorData(123, (elements) => {
        elements[0].settings.new_property = 'test';
      });

      const savedData = JSON.parse(
        vi.mocked(makeWordPressRequest).mock.calls[1][2].meta._elementor_data
      );
      expect(savedData[0].settings.new_property).toBe('test');
    });

    it('should return mutator result', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({});

      const result = await withElementorData(123, (elements) => {
        return { count: elements.length, firstId: elements[0].id };
      });

      expect(result).toEqual({ count: 1, firstId: 'sec1' });
    });

    it('should handle mutator that returns undefined', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({});

      const result = await withElementorData(123, (elements) => {
        elements.push({
          id: 'new',
          elType: 'section',
          settings: {},
          elements: [],
        });
      });

      expect(result).toBeUndefined();
      const savedData = JSON.parse(
        vi.mocked(makeWordPressRequest).mock.calls[1][2].meta._elementor_data
      );
      expect(savedData).toHaveLength(2);
    });

    it('should propagate errors from fetch', async () => {
      vi.mocked(makeWordPressRequest)
        .mockRejectedValueOnce(new Error('Fetch failed'))
        .mockRejectedValueOnce(new Error('Fetch failed'));

      await expect(
        withElementorData(123, () => 'test')
      ).rejects.toThrow('Could not find post or page with ID 123');
    });

    it('should propagate errors from save', async () => {
      const mockResponse = {
        meta: {
          _elementor_data: JSON.stringify(mockElementorData),
        },
      };

      vi.mocked(makeWordPressRequest)
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockRejectedValueOnce(new Error('Save failed'));

      await expect(
        withElementorData(123, () => 'test')
      ).rejects.toThrow('Failed to save Elementor data for post/page 123');
    });
  });
});

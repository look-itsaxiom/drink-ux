import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchBusinessTheme,
  BusinessTheme,
  ThemeServiceError,
} from './themeService';
import { createMockResponse, createMockErrorResponse } from '../test/setup';

describe('themeService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchBusinessTheme', () => {
    it('fetches theme for valid business slug', async () => {
      const mockTheme: BusinessTheme = {
        primaryColor: '#ff6b6b',
        secondaryColor: '#4ecdc4',
        logoUrl: 'https://example.com/logo.png',
      };

      const mockApiResponse = {
        success: true,
        data: {
          id: 'business-123',
          name: 'Test Coffee',
          slug: 'test-coffee',
          accountState: 'ACTIVE',
          theme: mockTheme,
          catalogSummary: { categoryCount: 5, itemCount: 20 },
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse(mockApiResponse)
      );

      const result = await fetchBusinessTheme('test-coffee');

      expect(result).toEqual(mockTheme);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/business/test-coffee',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('returns null for business without theme', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          id: 'business-123',
          name: 'Test Coffee',
          slug: 'test-coffee',
          accountState: 'ACTIVE',
          theme: null,
          catalogSummary: { categoryCount: 5, itemCount: 20 },
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse(mockApiResponse)
      );

      const result = await fetchBusinessTheme('test-coffee');

      expect(result).toBeNull();
    });

    it('returns null for 404 errors (business not found)', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockErrorResponse('BUSINESS_NOT_FOUND', 'Business not found', 404)
      );

      const result = await fetchBusinessTheme('non-existent');

      expect(result).toBeNull();
    });

    it('throws ThemeServiceError for network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(
        new TypeError('Failed to fetch')
      );

      await expect(fetchBusinessTheme('test-coffee')).rejects.toThrow(
        ThemeServiceError
      );
      await expect(fetchBusinessTheme('test-coffee')).rejects.toThrow(
        'Network error'
      );
    });

    it('throws ThemeServiceError for non-404 HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockErrorResponse('INTERNAL_ERROR', 'Server error', 500)
      );

      await expect(fetchBusinessTheme('test-coffee')).rejects.toThrow(
        ThemeServiceError
      );
    });

    it('uses custom API base URL when provided', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          id: 'business-123',
          name: 'Test Coffee',
          slug: 'test-coffee',
          theme: null,
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse(mockApiResponse)
      );

      await fetchBusinessTheme('test-coffee', {
        apiBaseUrl: 'https://api.custom.com',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.custom.com/api/business/test-coffee',
        expect.anything()
      );
    });

    it('handles timeout via AbortController', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new DOMException('Aborted', 'AbortError')
      );

      await expect(fetchBusinessTheme('test-coffee')).rejects.toThrow(
        'Request timeout'
      );
    });

    it('validates business slug format', async () => {
      await expect(fetchBusinessTheme('')).rejects.toThrow(
        'Business slug is required'
      );
      await expect(fetchBusinessTheme('   ')).rejects.toThrow(
        'Business slug is required'
      );
    });
  });
});

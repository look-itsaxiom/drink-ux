import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountState } from '@drink-ux/shared';
import {
  getBusinessBySubdomain,
  getSubdomain,
  BusinessConfigData,
} from '../businessService';
import { ApiClientError } from '../api';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

describe('businessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubdomain', () => {
    it('should return query param business on localhost', () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      const result = getSubdomain();
      expect(result).toBe('test-coffee-shop');
    });

    it('should return null on localhost without query param', () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '',
      });

      const result = getSubdomain();
      expect(result).toBeNull();
    });

    it('should extract subdomain from full domain', () => {
      Object.assign(window.location, {
        hostname: 'test-coffee-shop.drink-ux.com',
        search: '',
      });

      const result = getSubdomain();
      expect(result).toBe('test-coffee-shop');
    });

    it('should return null for main domain without subdomain', () => {
      Object.assign(window.location, {
        hostname: 'drink-ux.com',
        search: '',
      });

      const result = getSubdomain();
      expect(result).toBeNull();
    });

    it('should handle www subdomain correctly', () => {
      Object.assign(window.location, {
        hostname: 'www.drink-ux.com',
        search: '',
      });

      const result = getSubdomain();
      // www should be treated as a reserved subdomain
      expect(result).toBeNull();
    });
  });

  describe('getBusinessBySubdomain', () => {
    const mockBusinessData: BusinessConfigData = {
      id: 'biz-123',
      name: 'Test Coffee Shop',
      slug: 'test-coffee-shop',
      accountState: AccountState.ACTIVE,
      theme: {
        primaryColor: '#6B4423',
        secondaryColor: '#D4A574',
        logoUrl: 'https://example.com/logo.png',
      },
      catalogSummary: {
        categoryCount: 5,
        itemCount: 20,
      },
    };

    it('should fetch business data successfully', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockBusinessData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getBusinessBySubdomain('test-coffee-shop');

      expect(result).toEqual(mockBusinessData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/business/test-coffee-shop'),
        expect.any(Object)
      );
    });

    it('should throw ApiClientError when business not found', async () => {
      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        "Business 'invalid-slug' not found",
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getBusinessBySubdomain('invalid-slug')).rejects.toThrow(
        ApiClientError
      );

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('BUSINESS_NOT_FOUND', 'Not found', 404)
        );
        await getBusinessBySubdomain('invalid-slug');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('BUSINESS_NOT_FOUND');
        expect((error as ApiClientError).status).toBe(404);
      }
    });

    it('should throw ApiClientError when business is not accessible', async () => {
      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        'Business is not currently accessible',
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getBusinessBySubdomain('paused-shop')).rejects.toThrow(
        ApiClientError
      );
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(getBusinessBySubdomain('test-coffee-shop')).rejects.toThrow(
        ApiClientError
      );

      try {
        vi.mocked(global.fetch).mockRejectedValueOnce(
          new TypeError('Failed to fetch')
        );
        await getBusinessBySubdomain('test-coffee-shop');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should handle server errors', async () => {
      const mockError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Server error',
        500
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getBusinessBySubdomain('test-coffee-shop')).rejects.toThrow(
        ApiClientError
      );

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('INTERNAL_ERROR', 'Server error', 500)
        );
        await getBusinessBySubdomain('test-coffee-shop');
      } catch (error) {
        expect((error as ApiClientError).status).toBe(500);
      }
    });
  });
});

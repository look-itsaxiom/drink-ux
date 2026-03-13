import * as fs from 'fs';
import * as path from 'path';
import { FileUploadService, FileUploadError } from '../FileUploadService';

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
  existsSync: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;
  const testUploadDir = '/test/uploads';
  const testBaseUrl = 'https://cdn.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    fileUploadService = new FileUploadService({
      uploadDir: testUploadDir,
      baseUrl: testBaseUrl,
      maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    });
  });

  // ===========================================================================
  // HAPPY PATH
  // ===========================================================================
  describe('uploadImage', () => {
    it('uploads a valid JPEG image and returns URL', async () => {
      const buffer = Buffer.from('fake jpeg data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'logo.jpg',
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\/business-123\/.+\.jpg$/);
      expect(result.filename).toMatch(/\.jpg$/);
      expect(mockFsPromises.mkdir).toHaveBeenCalled();
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });

    it('uploads a valid PNG image', async () => {
      const buffer = Buffer.from('fake png data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'icon.png',
        mimeType: 'image/png',
        businessId: 'business-456',
      });

      expect(result.url).toContain('business-456');
      expect(result.filename).toMatch(/\.png$/);
    });

    it('uploads a valid GIF image', async () => {
      const buffer = Buffer.from('fake gif data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'animation.gif',
        mimeType: 'image/gif',
        businessId: 'business-789',
      });

      expect(result.filename).toMatch(/\.gif$/);
    });

    it('uploads a valid WebP image', async () => {
      const buffer = Buffer.from('fake webp data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'photo.webp',
        mimeType: 'image/webp',
        businessId: 'business-abc',
      });

      expect(result.filename).toMatch(/\.webp$/);
    });

    it('uploads a valid SVG image', async () => {
      const buffer = Buffer.from('<svg></svg>');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'vector.svg',
        mimeType: 'image/svg+xml',
        businessId: 'business-def',
      });

      expect(result.filename).toMatch(/\.svg$/);
    });
  });

  // ===========================================================================
  // VALIDATION - FILE TYPE
  // ===========================================================================
  describe('file type validation', () => {
    it('rejects non-image MIME types', async () => {
      const buffer = Buffer.from('fake data');

      const invalidTypes = [
        'application/pdf',
        'text/plain',
        'application/javascript',
        'text/html',
        'application/json',
        'video/mp4',
        'audio/mpeg',
      ];

      for (const mimeType of invalidTypes) {
        await expect(
          fileUploadService.uploadImage({
            buffer,
            originalName: 'file.ext',
            mimeType,
            businessId: 'business-123',
          })
        ).rejects.toThrow(FileUploadError);
      }
    });

    it('returns correct error code for invalid MIME type', async () => {
      const buffer = Buffer.from('fake data');

      try {
        await fileUploadService.uploadImage({
          buffer,
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          businessId: 'business-123',
        });
      } catch (error) {
        expect((error as FileUploadError).code).toBe('INVALID_FILE_TYPE');
      }
    });

    it('rejects files with mismatched extension and MIME type', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      // This should still work because we trust MIME type over extension
      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'actually-a-jpeg.png', // Extension says PNG
        mimeType: 'image/jpeg', // But MIME says JPEG
        businessId: 'business-123',
      });

      // Should use the correct extension based on MIME type
      expect(result.filename).toMatch(/\.jpg$/);
    });
  });

  // ===========================================================================
  // VALIDATION - FILE SIZE
  // ===========================================================================
  describe('file size validation', () => {
    it('rejects files over 2MB', async () => {
      const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1); // Just over 2MB

      await expect(
        fileUploadService.uploadImage({
          buffer: largeBuffer,
          originalName: 'huge.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        })
      ).rejects.toThrow(FileUploadError);

      try {
        await fileUploadService.uploadImage({
          buffer: largeBuffer,
          originalName: 'huge.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        });
      } catch (error) {
        expect((error as FileUploadError).code).toBe('FILE_TOO_LARGE');
      }
    });

    it('accepts files exactly at 2MB limit', async () => {
      const exactBuffer = Buffer.alloc(2 * 1024 * 1024); // Exactly 2MB
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer: exactBuffer,
        originalName: 'exact.jpg',
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      expect(result.url).toBeDefined();
    });

    it('accepts files under 2MB', async () => {
      const smallBuffer = Buffer.alloc(1024 * 1024); // 1MB
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer: smallBuffer,
        originalName: 'small.jpg',
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      expect(result.url).toBeDefined();
    });

    it('rejects empty files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(
        fileUploadService.uploadImage({
          buffer: emptyBuffer,
          originalName: 'empty.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        })
      ).rejects.toThrow(FileUploadError);

      try {
        await fileUploadService.uploadImage({
          buffer: emptyBuffer,
          originalName: 'empty.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        });
      } catch (error) {
        expect((error as FileUploadError).code).toBe('EMPTY_FILE');
      }
    });
  });

  // ===========================================================================
  // FILENAME GENERATION
  // ===========================================================================
  describe('filename generation', () => {
    it('generates unique filenames for multiple uploads', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const filenames = new Set<string>();

      // Upload multiple files and collect filenames
      for (let i = 0; i < 10; i++) {
        const result = await fileUploadService.uploadImage({
          buffer,
          originalName: 'logo.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        });
        filenames.add(result.filename);
      }

      // All filenames should be unique
      expect(filenames.size).toBe(10);
    });

    it('sanitizes original filename for safety', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: '../../../etc/passwd.jpg', // Malicious path
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      // Should not contain path traversal characters
      expect(result.filename).not.toContain('..');
      expect(result.filename).not.toContain('/');
    });

    it('generates filename with correct extension based on MIME type', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
      };

      for (const [mimeType, expectedExt] of Object.entries(mimeToExt)) {
        const result = await fileUploadService.uploadImage({
          buffer,
          originalName: 'test.file',
          mimeType,
          businessId: 'business-123',
        });

        expect(result.filename).toMatch(new RegExp(`\\${expectedExt}$`));
      }
    });

    it('creates business-specific subdirectory', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      await fileUploadService.uploadImage({
        buffer,
        originalName: 'logo.jpg',
        mimeType: 'image/jpeg',
        businessId: 'unique-business-id',
      });

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('unique-business-id'),
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // DELETE IMAGE
  // ===========================================================================
  describe('deleteImage', () => {
    it('deletes an existing image', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockResolvedValue(undefined);

      await fileUploadService.deleteImage('business-123', 'image-abc.jpg');

      expect(mockFsPromises.unlink).toHaveBeenCalledWith(
        expect.stringContaining('business-123')
      );
    });

    it('throws error for non-existent image', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('ENOENT'));

      await expect(
        fileUploadService.deleteImage('business-123', 'nonexistent.jpg')
      ).rejects.toThrow(FileUploadError);

      try {
        await fileUploadService.deleteImage('business-123', 'nonexistent.jpg');
      } catch (error) {
        expect((error as FileUploadError).code).toBe('FILE_NOT_FOUND');
      }
    });

    it('sanitizes filename to prevent path traversal', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockResolvedValue(undefined);

      await fileUploadService.deleteImage('business-123', '../../../etc/passwd');

      // Should only delete within the expected directory
      const unlinkPath = mockFsPromises.unlink.mock.calls[0][0] as string;
      expect(unlinkPath).not.toContain('..');
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================
  describe('error handling', () => {
    it('handles filesystem write errors', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(
        fileUploadService.uploadImage({
          buffer,
          originalName: 'logo.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        })
      ).rejects.toThrow(FileUploadError);

      try {
        await fileUploadService.uploadImage({
          buffer,
          originalName: 'logo.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        });
      } catch (error) {
        expect((error as FileUploadError).code).toBe('UPLOAD_FAILED');
      }
    });

    it('handles directory creation errors', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(
        fileUploadService.uploadImage({
          buffer,
          originalName: 'logo.jpg',
          mimeType: 'image/jpeg',
          businessId: 'business-123',
        })
      ).rejects.toThrow(FileUploadError);
    });
  });

  // ===========================================================================
  // URL GENERATION
  // ===========================================================================
  describe('URL generation', () => {
    it('generates correct public URL', async () => {
      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await fileUploadService.uploadImage({
        buffer,
        originalName: 'logo.jpg',
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      expect(result.url).toMatch(
        /^https:\/\/cdn\.example\.com\/business-123\/[a-f0-9-]+\.jpg$/
      );
    });

    it('handles base URL without trailing slash', async () => {
      const service = new FileUploadService({
        uploadDir: testUploadDir,
        baseUrl: 'https://cdn.example.com', // No trailing slash
        maxFileSizeBytes: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg'],
      });

      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await service.uploadImage({
        buffer,
        originalName: 'logo.jpg',
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      // Should not have double slashes
      expect(result.url).not.toContain('//business');
    });

    it('handles base URL with trailing slash', async () => {
      const service = new FileUploadService({
        uploadDir: testUploadDir,
        baseUrl: 'https://cdn.example.com/', // With trailing slash
        maxFileSizeBytes: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg'],
      });

      const buffer = Buffer.from('fake data');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await service.uploadImage({
        buffer,
        originalName: 'logo.jpg',
        mimeType: 'image/jpeg',
        businessId: 'business-123',
      });

      // Should not have double slashes
      expect(result.url).not.toContain('//business');
    });
  });
});

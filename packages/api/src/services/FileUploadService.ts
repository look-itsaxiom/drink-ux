import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Custom error class for file upload errors
 */
export class FileUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * Configuration for FileUploadService
 */
export interface FileUploadConfig {
  uploadDir: string;
  baseUrl: string;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}

/**
 * Input for uploading an image
 */
export interface UploadImageInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  businessId: string;
}

/**
 * Result of uploading an image
 */
export interface UploadImageResult {
  url: string;
  filename: string;
}

// MIME type to file extension mapping
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

/**
 * File Upload Service - handles file uploads for business assets
 */
export class FileUploadService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly maxFileSizeBytes: number;
  private readonly allowedMimeTypes: Set<string>;

  constructor(config: FileUploadConfig) {
    this.uploadDir = config.uploadDir;
    // Remove trailing slash from baseUrl if present
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.maxFileSizeBytes = config.maxFileSizeBytes;
    this.allowedMimeTypes = new Set(config.allowedMimeTypes);
  }

  /**
   * Upload an image file
   */
  async uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
    const { buffer, mimeType, businessId } = input;

    // Validate file is not empty
    if (buffer.length === 0) {
      throw new FileUploadError('EMPTY_FILE', 'File cannot be empty');
    }

    // Validate file size
    if (buffer.length > this.maxFileSizeBytes) {
      throw new FileUploadError(
        'FILE_TOO_LARGE',
        `File exceeds maximum size of ${this.maxFileSizeBytes} bytes`
      );
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new FileUploadError(
        'INVALID_FILE_TYPE',
        `File type ${mimeType} is not allowed`
      );
    }

    // Get file extension based on MIME type
    const extension = MIME_TO_EXT[mimeType] || '.bin';

    // Generate unique filename
    const filename = `${randomUUID()}${extension}`;

    // Sanitize business ID for path
    const safeBusinessId = this.sanitizePath(businessId);

    // Create business-specific directory
    const businessDir = path.join(this.uploadDir, safeBusinessId);

    try {
      // Create directory if it doesn't exist
      await fs.promises.mkdir(businessDir, { recursive: true });

      // Write file
      const filePath = path.join(businessDir, filename);
      await fs.promises.writeFile(filePath, buffer);

      // Generate URL
      const url = `${this.baseUrl}/${safeBusinessId}/${filename}`;

      return { url, filename };
    } catch (error) {
      throw new FileUploadError(
        'UPLOAD_FAILED',
        `Failed to upload file: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete an uploaded image
   */
  async deleteImage(businessId: string, filename: string): Promise<void> {
    // Sanitize inputs to prevent path traversal
    const safeBusinessId = this.sanitizePath(businessId);
    const safeFilename = this.sanitizePath(filename);

    const filePath = path.join(this.uploadDir, safeBusinessId, safeFilename);

    try {
      // Check if file exists
      await fs.promises.access(filePath);

      // Delete file
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new FileUploadError(
        'FILE_NOT_FOUND',
        'File not found or could not be deleted'
      );
    }
  }

  /**
   * Sanitize a path component to prevent path traversal
   */
  private sanitizePath(input: string): string {
    // Remove any path separators and parent directory references
    return input
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '');
  }
}

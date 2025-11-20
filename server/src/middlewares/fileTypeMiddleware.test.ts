import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { UploadedFile } from 'express-fileupload';
import { fileTypeMiddleware } from './fileTypeMiddleware';

// Mock logger
vi.mock('~/infra/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('fileTypeMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockRequest = {
      files: undefined
    };

    mockResponse = {
      status: statusMock as any,
      json: jsonMock
    };

    nextFunction = vi.fn();
  });

  describe('No files uploaded', () => {
    it('should call next() when no files are present', async () => {
      mockRequest.files = undefined;

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should call next() when files object is empty', async () => {
      mockRequest.files = {};

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Valid file uploads', () => {
    it('should accept a valid PNG file', async () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
      ]);

      const mockFile: UploadedFile = {
        name: 'test.png',
        mimetype: 'image/png',
        data: pngBuffer,
        size: pngBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept a valid JPEG file', async () => {
      // JPEG magic bytes: FF D8 FF E0
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01
      ]);

      const mockFile: UploadedFile = {
        name: 'test.jpg',
        mimetype: 'image/jpeg',
        data: jpegBuffer,
        size: jpegBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept a valid PDF file', async () => {
      // PDF magic bytes: 25 50 44 46 (%PDF)
      const pdfBuffer = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
        0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a
      ]);

      const mockFile: UploadedFile = {
        name: 'test.pdf',
        mimetype: 'application/pdf',
        data: pdfBuffer,
        size: pdfBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('MIME type spoofing detection', () => {
    it('should reject an EXE file renamed as PNG', async () => {
      // Windows EXE magic bytes: 4D 5A (MZ)
      const exeBuffer = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
        0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00
      ]);

      const mockFile: UploadedFile = {
        name: 'malicious.png',
        mimetype: 'image/png', // Spoofed MIME type
        data: exeBuffer,
        size: exeBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file type',
          fileName: 'malicious.png'
        })
      );
    });

    it('should reject a ZIP file renamed as PDF', async () => {
      // ZIP magic bytes: 50 4B 03 04
      const zipBuffer = Buffer.from([
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
        0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);

      const mockFile: UploadedFile = {
        name: 'document.pdf',
        mimetype: 'application/pdf', // Spoofed MIME type
        data: zipBuffer,
        size: zipBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file type',
          fileName: 'document.pdf'
        })
      );
    });

    it('should reject when PNG magic bytes are declared as JPEG', async () => {
      // PNG magic bytes
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
      ]);

      const mockFile: UploadedFile = {
        name: 'image.jpg',
        mimetype: 'image/jpeg', // Wrong MIME type for PNG content
        data: pngBuffer,
        size: pngBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid file type',
          message: expect.stringContaining('does not match actual file type'),
          fileName: 'image.jpg'
        })
      );
    });
  });

  describe('Multiple files upload', () => {
    it('should validate multiple files successfully', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d
      ]);

      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46
      ]);

      const mockFiles: UploadedFile[] = [
        {
          name: 'image1.png',
          mimetype: 'image/png',
          data: pngBuffer,
          size: pngBuffer.length,
          encoding: '7bit',
          tempFilePath: '',
          truncated: false,
          md5: '',
          mv: vi.fn()
        },
        {
          name: 'image2.jpg',
          mimetype: 'image/jpeg',
          data: jpegBuffer,
          size: jpegBuffer.length,
          encoding: '7bit',
          tempFilePath: '',
          truncated: false,
          md5: '',
          mv: vi.fn()
        }
      ];

      mockRequest.files = { files: mockFiles };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject all files if one is invalid', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
      ]);

      const exeBuffer = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00
      ]);

      const mockFiles: UploadedFile[] = [
        {
          name: 'valid.png',
          mimetype: 'image/png',
          data: pngBuffer,
          size: pngBuffer.length,
          encoding: '7bit',
          tempFilePath: '',
          truncated: false,
          md5: '',
          mv: vi.fn()
        },
        {
          name: 'malicious.png',
          mimetype: 'image/png',
          data: exeBuffer, // Invalid content
          size: exeBuffer.length,
          encoding: '7bit',
          tempFilePath: '',
          truncated: false,
          md5: '',
          mv: vi.fn()
        }
      ];

      mockRequest.files = { files: mockFiles };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('Invalid or unrecognized files', () => {
    it('should reject files with unrecognizable magic bytes', async () => {
      // Random bytes that don't match any known format
      const unknownBuffer = Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);

      const mockFile: UploadedFile = {
        name: 'unknown.png',
        mimetype: 'image/png',
        data: unknownBuffer,
        size: unknownBuffer.length,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should reject empty files', async () => {
      const emptyBuffer = Buffer.from([]);

      const mockFile: UploadedFile = {
        name: 'empty.png',
        mimetype: 'image/png',
        data: emptyBuffer,
        size: 0,
        encoding: '7bit',
        tempFilePath: '',
        truncated: false,
        md5: '',
        mv: vi.fn()
      };

      mockRequest.files = { file: mockFile };

      await fileTypeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});

import { Either } from 'effect';
import { vitest, type Mock } from 'vitest';

import * as clamav from '~/infra/clamav';
import config from '~/infra/config';
import { validateFiles } from '../file-validation';

// Mock ClamAV functions
vitest.mock('~/infra/clamav');

describe('File Validation Service', () => {
  describe('validateFiles', () => {
    const mockFile = (
      filename: string,
      mimetype: string,
      buffer: Buffer
    ): Express.Multer.File => ({
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      size: buffer.length,
      buffer,
      stream: {} as any,
      destination: '',
      filename: '',
      path: ''
    });

    beforeEach(() => {
      vitest.clearAllMocks();
      // Mock ClamAV as disabled by default
      (clamav.isClamAVAvailable as Mock).mockResolvedValue(false);
      vitest.spyOn(config.clamav, 'enabled', 'get').mockReturnValue(false);
    });

    describe('File Type Validation', () => {
      it('should accept valid PNG file', async () => {
        const pngBuffer = Buffer.from([
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a, // PNG signature
          0x00,
          0x00,
          0x00,
          0x0d,
          0x49,
          0x48,
          0x44,
          0x52
        ]);
        const file = mockFile('test.png', 'image/png', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(file);
        }
      });

      it('should accept valid JPEG file', async () => {
        const jpegBuffer = Buffer.from([
          0xff,
          0xd8,
          0xff,
          0xe0, // JPEG signature
          0x00,
          0x10,
          0x4a,
          0x46,
          0x49,
          0x46
        ]);
        const file = mockFile('test.jpg', 'image/jpeg', jpegBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(file);
        }
      });

      it('should accept valid PDF file', async () => {
        const pdfBuffer = Buffer.from([
          0x25,
          0x50,
          0x44,
          0x46,
          0x2d, // %PDF-
          0x31,
          0x2e,
          0x34 // 1.4
        ]);
        const file = mockFile('test.pdf', 'application/pdf', pdfBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(file);
        }
      });

      it('should reject file with undetectable type', async () => {
        const invalidBuffer = Buffer.from('invalid content');
        const file = mockFile('test.png', 'image/png', invalidBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            message: expect.stringContaining('Could not detect file type'),
            data: {
              filename: 'test.png',
              reason: 'invalid_file_type'
            }
          })
        );
      });

      it('should reject file with disallowed type', async () => {
        // Text file magic bytes
        const txtBuffer = Buffer.from('Hello world');
        const file = mockFile('test.txt', 'text/plain', txtBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            data: {
              filename: 'test.txt',
              reason: 'invalid_file_type'
            }
          })
        );
      });

      it('should reject file with MIME mismatch (spoofing)', async () => {
        // PNG buffer but declared as PDF
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const file = mockFile('fake.pdf', 'application/pdf', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            message: expect.stringContaining('does not match'),
            data: {
              filename: 'fake.pdf',
              reason: 'mime_mismatch'
            }
          })
        );
      });
    });

    describe('Virus Scanning', () => {
      it('should skip virus scanning when ClamAV is disabled', async () => {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const file = mockFile('test.png', 'image/png', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(file);
        }
        expect(clamav.isClamAVAvailable).not.toHaveBeenCalled();
        expect(clamav.scanBuffer).not.toHaveBeenCalled();
      });

      it('should scan for viruses when ClamAV is enabled and available', async () => {
        vitest.spyOn(config.clamav, 'enabled', 'get').mockReturnValue(true);
        (clamav.isClamAVAvailable as Mock).mockResolvedValue(true);
        (clamav.scanBuffer as Mock).mockResolvedValue({
          isInfected: false,
          viruses: [],
          file: 'test.png'
        });

        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const file = mockFile('test.png', 'image/png', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(file);
        }
        expect(clamav.isClamAVAvailable).toHaveBeenCalled();
        expect(clamav.scanBuffer).toHaveBeenCalledWith(pngBuffer, 'test.png');
      });

      it('should reject file when virus detected', async () => {
        vitest.spyOn(config.clamav, 'enabled', 'get').mockReturnValue(true);
        (clamav.isClamAVAvailable as Mock).mockResolvedValue(true);
        (clamav.scanBuffer as Mock).mockResolvedValue({
          isInfected: true,
          viruses: ['EICAR-Test-File'],
          file: 'infected.png'
        });

        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const file = mockFile('infected.png', 'image/png', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            message: expect.stringContaining('malicious content'),
            data: {
              filename: 'infected.png',
              reason: 'virus_detected',
              viruses: ['EICAR-Test-File']
            }
          })
        );
      });

      it('should fail in production when ClamAV is enabled but unavailable', async () => {
        vitest.spyOn(config.clamav, 'enabled', 'get').mockReturnValue(true);
        vitest.spyOn(config.app, 'env', 'get').mockReturnValue('production');
        (clamav.isClamAVAvailable as Mock).mockResolvedValue(false);

        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const file = mockFile('test.png', 'image/png', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            message: 'Antivirus service unavailable',
            data: {
              reason: 'virus_detected'
            }
          })
        );
      });

      it('should pass in development when ClamAV is enabled but unavailable', async () => {
        vitest.spyOn(config.clamav, 'enabled', 'get').mockReturnValue(true);
        vitest.spyOn(config.app, 'env', 'get').mockReturnValue('development');
        (clamav.isClamAVAvailable as Mock).mockResolvedValue(false);

        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const file = mockFile('test.png', 'image/png', pngBuffer);

        const results = await validateFiles([file]);

        expect(results).toHaveLength(1);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(file);
        }
      });
    });

    describe('Multiple Files', () => {
      it('should validate multiple files in parallel', async () => {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const jpegBuffer = Buffer.from([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46
        ]);
        const pdfBuffer = Buffer.from([
          0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34
        ]);

        const files = [
          mockFile('test1.png', 'image/png', pngBuffer),
          mockFile('test2.jpg', 'image/jpeg', jpegBuffer),
          mockFile('test3.pdf', 'application/pdf', pdfBuffer)
        ];

        const results = await validateFiles(files);

        expect(results).toHaveLength(3);
        expect(Either.isRight(results[0])).toBe(true);
        expect(Either.isRight(results[1])).toBe(true);
        expect(Either.isRight(results[2])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(files[0]);
        }
        if (Either.isRight(results[1])) {
          expect(results[1].right).toBe(files[1]);
        }
        if (Either.isRight(results[2])) {
          expect(results[2].right).toBe(files[2]);
        }
      });

      it('should return mixed results (valid files and errors)', async () => {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);
        const invalidBuffer = Buffer.from('invalid content');
        const txtBuffer = Buffer.from('Hello world');

        const files = [
          mockFile('valid.png', 'image/png', pngBuffer),
          mockFile('undetectable.png', 'image/png', invalidBuffer),
          mockFile('disallowed.txt', 'text/plain', txtBuffer)
        ];

        const results = await validateFiles(files);

        expect(results).toHaveLength(3);
        expect(results[0]).toStrictEqual(Either.right(files[0]));
        expect(results[1]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            data: {
              reason: 'invalid_file_type'
            }
          })
        );
        expect(results[2]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            data: {
              reason: 'invalid_file_type'
            }
          })
        );
      });

      it('should detect MIME spoofing in batch', async () => {
        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);

        const files = [
          mockFile('honest.png', 'image/png', pngBuffer),
          mockFile('spoofed.pdf', 'application/pdf', pngBuffer) // PNG pretending to be PDF
        ];

        const results = await validateFiles(files);

        expect(results).toHaveLength(2);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(files[0]); // Honest file
        }
        expect(results[1]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            data: {
              reason: 'mime_mismatch'
            }
          })
        );
      });

      it('should process all files even if some fail', async () => {
        vitest.spyOn(config.clamav, 'enabled', 'get').mockReturnValue(true);
        (clamav.isClamAVAvailable as Mock).mockResolvedValue(true);

        // Mock scan results for different files
        (clamav.scanBuffer as Mock)
          .mockResolvedValueOnce({
            isInfected: false,
            viruses: [],
            file: 'clean.png'
          })
          .mockResolvedValueOnce({
            isInfected: true,
            viruses: ['EICAR-Test-File'],
            file: 'infected.png'
          });

        const pngBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
          0x0d, 0x49, 0x48, 0x44, 0x52
        ]);

        const files = [
          mockFile('clean.png', 'image/png', pngBuffer),
          mockFile('infected.png', 'image/png', pngBuffer)
        ];

        const results = await validateFiles(files);

        expect(results).toHaveLength(2);
        expect(Either.isRight(results[0])).toBe(true);
        if (Either.isRight(results[0])) {
          expect(results[0].right).toBe(files[0]); // Clean file
        }
        expect(results[1]).toMatchObject(
          Either.left({
            name: 'FileValidationError',
            data: {
              reason: 'virus_detected'
            }
          })
        );
      });
    });
  });
});

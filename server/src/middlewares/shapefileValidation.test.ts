import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { shapefileValidationMiddleware } from './shapefileValidation';
import BadRequestError from '~/errors/badRequestError';

// Mock logger
vi.mock('~/infra/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AdmZip
vi.mock('adm-zip', () => {
  return {
    default: vi.fn().mockImplementation((buffer: Buffer) => {
      // Simple mock that returns entries based on buffer content
      if (buffer.toString().includes('VALID_SHAPEFILE')) {
        return {
          getEntries: vi.fn().mockReturnValue([
            {
              entryName: 'test.shp',
              getData: vi.fn().mockReturnValue(Buffer.from('mock shp data')),
            },
            {
              entryName: 'test.dbf',
              getData: vi.fn().mockReturnValue(Buffer.from('mock dbf data')),
            },
          ]),
        };
      }
      if (buffer.toString().includes('NO_SHP')) {
        return {
          getEntries: vi.fn().mockReturnValue([
            {
              entryName: 'test.dbf',
              getData: vi.fn().mockReturnValue(Buffer.from('mock dbf data')),
            },
          ]),
        };
      }
      if (buffer.toString().includes('NO_DBF')) {
        return {
          getEntries: vi.fn().mockReturnValue([
            {
              entryName: 'test.shp',
              getData: vi.fn().mockReturnValue(Buffer.from('mock shp data')),
            },
          ]),
        };
      }
      return {
        getEntries: vi.fn().mockReturnValue([]),
      };
    }),
  };
});

// Mock shapefile
vi.mock('shapefile', () => {
  return {
    default: {
      open: vi.fn().mockImplementation(async () => {
        const featureCount = parseInt(process.env.TEST_FEATURE_COUNT || '5', 10);
        let readCount = 0;
        return {
          read: vi.fn().mockImplementation(async () => {
            readCount++;
            if (readCount > featureCount) {
              return { done: true };
            }
            return {
              done: false,
              value: { type: 'Feature', properties: {}, geometry: {} },
            };
          }),
        };
      }),
    },
  };
});

describe('shapefileValidationMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      file: undefined,
    };
    mockResponse = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
    delete process.env.MAX_SHAPEFILE_FEATURES;
    delete process.env.TEST_FEATURE_COUNT;
  });

  it('should skip validation if no file uploaded', async () => {
    await shapefileValidationMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it('should validate a valid shapefile', async () => {
    mockRequest.file = {
      originalname: 'test.zip',
      buffer: Buffer.from('VALID_SHAPEFILE'),
      mimetype: 'application/zip',
      size: 1024,
    } as Express.Multer.File;

    process.env.TEST_FEATURE_COUNT = '5';

    await shapefileValidationMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    expect((mockRequest as any).shapefileFeatureCount).toBe(5);
  });

  it('should reject shapefile without .shp file', async () => {
    mockRequest.file = {
      originalname: 'test.zip',
      buffer: Buffer.from('NO_SHP'),
      mimetype: 'application/zip',
      size: 1024,
    } as Express.Multer.File;

    await shapefileValidationMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    const error = (mockNext as any).mock.calls[0][0] as BadRequestError;
    expect(error.message).toContain('Missing .shp file');
  });

  it('should reject shapefile without .dbf file', async () => {
    mockRequest.file = {
      originalname: 'test.zip',
      buffer: Buffer.from('NO_DBF'),
      mimetype: 'application/zip',
      size: 1024,
    } as Express.Multer.File;

    await shapefileValidationMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    const error = (mockNext as any).mock.calls[0][0] as BadRequestError;
    expect(error.message).toContain('Missing .dbf file');
  });

  it('should reject shapefile with too many features', async () => {
    mockRequest.file = {
      originalname: 'test.zip',
      buffer: Buffer.from('VALID_SHAPEFILE'),
      mimetype: 'application/zip',
      size: 1024,
    } as Express.Multer.File;

    process.env.MAX_SHAPEFILE_FEATURES = '10';
    process.env.TEST_FEATURE_COUNT = '15';

    await shapefileValidationMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    const error = (mockNext as any).mock.calls[0][0] as BadRequestError;
    expect(error.message).toContain('too many features');
    expect(error.message).toContain('10');
  });

  it('should use default max features of 10000', async () => {
    mockRequest.file = {
      originalname: 'test.zip',
      buffer: Buffer.from('VALID_SHAPEFILE'),
      mimetype: 'application/zip',
      size: 1024,
    } as Express.Multer.File;

    process.env.TEST_FEATURE_COUNT = '100';

    await shapefileValidationMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
  });
});

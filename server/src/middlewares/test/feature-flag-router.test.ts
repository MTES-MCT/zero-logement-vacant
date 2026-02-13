import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import featureFlagRouter from '../feature-flag-router';

describe('featureFlagRouter', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: ReturnType<typeof vi.fn>;
  let whenEnabled: ReturnType<typeof vi.fn>;
  let whenDisabled: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = vi.fn();
    whenEnabled = vi.fn();
    whenDisabled = vi.fn();
    delete process.env.TEST_FLAG;
  });

  it('should call whenDisabled when flag is not set', async () => {
    const middleware = featureFlagRouter('TEST_FLAG', whenEnabled, whenDisabled);

    await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(whenDisabled).toHaveBeenCalledWith(mockRequest, mockResponse, nextFunction);
    expect(whenEnabled).not.toHaveBeenCalled();
  });

  it('should call whenDisabled when flag is false', async () => {
    process.env.TEST_FLAG = 'false';
    const middleware = featureFlagRouter('TEST_FLAG', whenEnabled, whenDisabled);

    await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(whenDisabled).toHaveBeenCalledWith(mockRequest, mockResponse, nextFunction);
    expect(whenEnabled).not.toHaveBeenCalled();
  });

  it('should call whenEnabled when flag is true', async () => {
    process.env.TEST_FLAG = 'true';
    const middleware = featureFlagRouter('TEST_FLAG', whenEnabled, whenDisabled);

    await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(whenEnabled).toHaveBeenCalledWith(mockRequest, mockResponse, nextFunction);
    expect(whenDisabled).not.toHaveBeenCalled();
  });

  it('should call whenDisabled for any non-true string value', async () => {
    const testValues = ['TRUE', 'True', '1', 'yes', 'enabled', ''];

    for (const value of testValues) {
      process.env.TEST_FLAG = value;
      whenEnabled.mockClear();
      whenDisabled.mockClear();

      const middleware = featureFlagRouter('TEST_FLAG', whenEnabled, whenDisabled);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(whenDisabled).toHaveBeenCalledWith(mockRequest, mockResponse, nextFunction);
      expect(whenEnabled).not.toHaveBeenCalled();
    }
  });
});

import { constants } from 'node:http2';
import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import campaignController from '../campaignController';

describe('campaignController.updateNext', () => {
  it('should return 501 Not Implemented', async () => {
    const mockRequest = {
      params: { id: 'test-id' }
    } as Partial<Request>;

    const mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as Partial<Response>;

    await campaignController.updateNext(
      mockRequest as Request,
      mockResponse as Response,
      vi.fn()
    );

    expect(mockResponse.status).toHaveBeenCalledWith(constants.HTTP_STATUS_NOT_IMPLEMENTED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'New campaign update flow not yet implemented'
    });
  });
});

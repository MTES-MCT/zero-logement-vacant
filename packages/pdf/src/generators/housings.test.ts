// packages/pdf/src/generators/housings.test.ts
import { describe, it, expect, vi } from 'vitest';
import { genHousingDTO, genOwnerDTO } from '@zerologementvacant/models/fixtures';
import * as ReactPDF from '@react-pdf/renderer';
import { Readable } from 'stream';

// Mock @react-pdf/renderer to avoid actual PDF rendering (OOM issues)
vi.mock('@react-pdf/renderer', async () => {
  const actual = await vi.importActual('@react-pdf/renderer');
  return {
    ...actual,
    renderToStream: vi.fn(() => {
      // Return a mock Node.js Readable stream
      const mockStream = new Readable();
      mockStream.push('%PDF-1.4\n');
      mockStream.push(null); // End stream
      return Promise.resolve(mockStream);
    }),
  };
});

describe('generate housings PDF', () => {
  it('should call renderToStream with Document containing HousingTemplate', async () => {
    const { generate } = await import('./housings');
    const housing = genHousingDTO(genOwnerDTO());

    await generate({ housings: [housing] });

    expect(ReactPDF.renderToStream).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(ReactPDF.renderToStream).mock.calls[0][0] as any;

    // Verify it's a Document component
    expect(callArg.type).toBe(ReactPDF.Document);

    // Verify it contains HousingTemplate children
    expect(callArg.props.children).toBeDefined();
  });

  it('should handle multiple housings', async () => {
    const { generate } = await import('./housings');
    const housings = [genHousingDTO(genOwnerDTO()), genHousingDTO(genOwnerDTO())];

    vi.clearAllMocks();
    await generate({ housings });

    expect(ReactPDF.renderToStream).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(ReactPDF.renderToStream).mock.calls[0][0] as any;

    // Verify Document has multiple HousingTemplate children
    expect(Array.isArray(callArg.props.children)).toBe(true);
    expect(callArg.props.children).toHaveLength(2);
  });

  it('should return web ReadableStream', async () => {
    const { generate } = await import('./housings');
    const housing = genHousingDTO(genOwnerDTO());

    const stream = await generate({ housings: [housing] });

    expect(stream).toBeInstanceOf(ReadableStream);
  });
});

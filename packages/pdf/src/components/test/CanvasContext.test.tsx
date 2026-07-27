import { Document, Page, renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';

import {
  CanvasProvider,
  useCanvas,
  type CanvasFactory
} from '../CanvasContext.js';

const fakeFactory: CanvasFactory = {
  createCanvas: () => ({
    canvas: {} as HTMLCanvasElement,
    toDataURL: () => 'data:image/png;base64,'
  }),
  loadImage: async () => ({}) as CanvasImageSource
};

function Probe({ onFactory }: { onFactory: (factory: CanvasFactory) => void }) {
  onFactory(useCanvas());
  return null;
}

describe('CanvasContext', () => {
  it('throws when used without a CanvasProvider ancestor', async () => {
    await expect(
      renderToBuffer(
        <Document>
          <Page size="A4">
            <Probe onFactory={() => {}} />
          </Page>
        </Document>
      )
    ).rejects.toThrow('useCanvas must be used within a CanvasProvider');
  });

  it('provides the factory passed to CanvasProvider', async () => {
    let receivedFactory: CanvasFactory | null = null;

    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4">
          <CanvasProvider factory={fakeFactory}>
            <Probe onFactory={(factory) => (receivedFactory = factory)} />
          </CanvasProvider>
        </Page>
      </Document>
    );

    expect(receivedFactory).toBe(fakeFactory);
    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });
});

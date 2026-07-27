// @vitest-environment node
import { Document, Page, renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';

import { nodeCanvasFactory } from '../../canvas/node.js';
import { CanvasProvider } from '../CanvasContext.js';
import { StaticMap } from '../StaticMap.js';

// A stubbed factory keeps the test offline: markers are rendered on the canvas
// but no real tile is fetched from the network.
const offlineFactory = {
  ...nodeCanvasFactory,
  loadImage: () => Promise.reject(new Error('offline'))
};

describe('StaticMap', () => {
  it('renders a valid PDF for a cluster of markers', async () => {
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4">
          <CanvasProvider factory={offlineFactory}>
            <StaticMap
              markers={[
                { longitude: 2.3522, latitude: 48.8566 },
                { longitude: 2.3333, latitude: 48.86 },
                { longitude: 2.37, latitude: 48.85 }
              ]}
            />
          </CanvasProvider>
        </Page>
      </Document>
    );

    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });

  it('falls back gracefully when no marker has coordinates', async () => {
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4">
          <CanvasProvider factory={offlineFactory}>
            <StaticMap markers={[{ longitude: null, latitude: null }]} />
          </CanvasProvider>
        </Page>
      </Document>
    );

    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });

  it('rejects when rendered without a CanvasProvider ancestor', async () => {
    await expect(
      renderToBuffer(
        <Document>
          <Page size="A4">
            <StaticMap markers={[{ longitude: 2.3522, latitude: 48.8566 }]} />
          </Page>
        </Document>
      )
    ).rejects.toThrow('useCanvas must be used within a CanvasProvider');
  });
});

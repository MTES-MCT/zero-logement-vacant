// @vitest-environment node
import { Document, Page, renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';

import { nodeCanvasFactory } from '../../canvas/node.js';
import { CanvasProvider } from '../CanvasContext.js';
import { PieChart } from '../PieChart.js';

describe('PieChart', () => {
  it('renders a valid PDF when wrapped in a CanvasProvider', async () => {
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4">
          <CanvasProvider factory={nodeCanvasFactory}>
            <PieChart
              data={[
                { label: 'Vacant', value: 30, color: '#e1000f' },
                { label: 'Occupé', value: 70, color: '#000091' }
              ]}
            />
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
            <PieChart data={[{ label: 'Vacant', value: 100 }]} />
          </Page>
        </Document>
      )
    ).rejects.toThrow('useCanvas must be used within a CanvasProvider');
  });
});

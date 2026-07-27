// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { nodeCanvasFactory } from '../node.js';

describe('nodeCanvasFactory', () => {
  it('creates a canvas with the given dimensions', () => {
    const { canvas } = nodeCanvasFactory.createCanvas(50, 30);

    expect(canvas.width).toBe(50);
    expect(canvas.height).toBe(30);
  });

  it('exports the drawn canvas as a base64 PNG data URL', async () => {
    const { canvas, toDataURL } = nodeCanvasFactory.createCanvas(10, 10);
    const context = canvas.getContext(
      '2d'
    ) as unknown as CanvasRenderingContext2D;
    context.fillStyle = 'red';
    context.fillRect(0, 0, 10, 10);

    const dataURL = await toDataURL();

    expect(dataURL).toMatch(/^data:image\/png;base64,/);
  });
});

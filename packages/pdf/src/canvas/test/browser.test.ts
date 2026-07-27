import { describe, expect, it } from 'vitest';

import { browserCanvasFactory } from '../browser.js';

describe('browserCanvasFactory', () => {
  it('creates a canvas element with the given dimensions', () => {
    const { canvas } = browserCanvasFactory.createCanvas(50, 30);

    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(50);
    expect(canvas.height).toBe(30);
  });

  it('delegates toDataURL to the canvas element', () => {
    const { canvas, toDataURL } = browserCanvasFactory.createCanvas(10, 10);

    expect(toDataURL()).toBe(canvas.toDataURL());
  });
});

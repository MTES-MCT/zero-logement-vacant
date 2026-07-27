import { Canvas, loadImage } from 'skia-canvas';

import type { CanvasFactory } from '~/components/CanvasContext.js';

export const nodeCanvasFactory: CanvasFactory = {
  createCanvas(width, height) {
    const canvas = new Canvas(width, height);

    return {
      canvas: canvas as unknown as HTMLCanvasElement,
      async toDataURL() {
        const buffer = await canvas.toBuffer('png');
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    };
  },
  async loadImage(source) {
    const image = await loadImage(source);
    return image as unknown as CanvasImageSource;
  }
};

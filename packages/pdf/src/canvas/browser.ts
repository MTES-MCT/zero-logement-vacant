import type { CanvasFactory } from '~/components/CanvasContext.js';

export const browserCanvasFactory: CanvasFactory = {
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    return {
      canvas,
      toDataURL: () => canvas.toDataURL()
    };
  },
  async loadImage(source) {
    const response = await fetch(source);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }
};

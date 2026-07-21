import { act, renderHook } from '@testing-library/react';
import type { MapRef } from 'react-map-gl/maplibre';
import { vi } from 'vitest';

import { type MapImage, useMapImages } from '../useMapImage';

describe('useMapImages', () => {
  it('registers an image while map sources are still loading', async () => {
    const image = {
      id: 'square-fill-0',
      path: '/map/square-fill-0.png'
    } satisfies MapImage;
    const imageData = {
      width: 17,
      height: 17,
      data: new Uint8ClampedArray(17 * 17 * 4)
    };
    let resolveImage!: (response: { data: typeof imageData }) => void;
    const loadImage = vi.fn(
      () =>
        new Promise<{ data: typeof imageData }>((resolve) => {
          resolveImage = resolve;
        })
    );
    const registeredImages = new Set<string>();
    const map = {
      addImage: vi.fn((id: string) => {
        registeredImages.add(id);
      }),
      hasImage: vi.fn((id: string) => registeredImages.has(id)),
      isStyleLoaded: vi.fn().mockReturnValueOnce(true).mockReturnValue(false),
      loadImage,
      off: vi.fn(),
      on: vi.fn()
    } as unknown as MapRef;

    renderHook(() => useMapImages(map, [image]));

    expect(loadImage).toHaveBeenCalledWith(image.path);

    await act(async () => {
      resolveImage({ data: imageData });
      await Promise.resolve();
    });

    expect(registeredImages.has(image.id)).toBe(true);
  });
});

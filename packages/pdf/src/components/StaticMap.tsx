import { Image } from '@react-pdf/renderer';
import bbox from '@turf/bbox';
import { points } from '@turf/helpers';
import square from '@turf/square';

import { useCanvas } from './CanvasContext.js';

const TILE_SIZE = 256;

/**
 * Default raster source: IGN Géoplateforme "Plan IGN", the same data provider
 * as the live map (`carte-facile`). Web Mercator (`TILEMATRIXSET=PM`) so it
 * lines up with the slippy-tile math below.
 */
const DEFAULT_TILE_URL =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&FORMAT=image/png';

export interface StaticMapMarker {
  longitude: number | null;
  latitude: number | null;
}

export interface StaticMapProps {
  markers: ReadonlyArray<StaticMapMarker>;
  /** Side of the square map, in pixels. */
  size?: number;
  /** Extra room around the markers, as a fraction of their extent (0.2 = 20%). */
  padding?: number;
  /** Tile URL template with `{z}`, `{x}`, `{y}` placeholders. */
  tileUrl?: string;
  /** Upper bound on zoom, i.e. how tight a single-marker map may get. */
  maxZoom?: number;
  markerRadius?: number;
  markerColor?: string;
  /** [longitude, latitude] used when no marker has coordinates. */
  fallbackCenter?: readonly [number, number];
  fallbackZoom?: number;
}

type Position = readonly [number, number];
interface View {
  center: Position;
  zoom: number;
}

function lonToTileX(longitude: number, zoom: number): number {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latToTileY(latitude: number, zoom: number): number {
  const radians = (latitude * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
    2 ** zoom
  );
}

/** World-pixel position of a coordinate at a given zoom. */
function project([longitude, latitude]: Position, zoom: number): Position {
  return [
    lonToTileX(longitude, zoom) * TILE_SIZE,
    latToTileY(latitude, zoom) * TILE_SIZE
  ];
}

/** Largest zoom at which the (square) box still fits within `size` pixels. */
function fitZoom(
  [west, south, east, north]: [number, number, number, number],
  size: number,
  maxZoom: number
): number {
  for (let zoom = maxZoom; zoom > 0; zoom--) {
    const width =
      Math.abs(lonToTileX(east, zoom) - lonToTileX(west, zoom)) * TILE_SIZE;
    const height =
      Math.abs(latToTileY(south, zoom) - latToTileY(north, zoom)) * TILE_SIZE;
    if (width <= size && height <= size) {
      return zoom;
    }
  }
  return 0;
}

export function StaticMap({
  markers,
  size = 500,
  padding = 0.2,
  tileUrl = DEFAULT_TILE_URL,
  maxZoom = 16,
  markerRadius = 5,
  markerColor = '#000091',
  fallbackCenter = [2.213749, 46.227638], // Metropolitan France
  fallbackZoom = 5
}: Readonly<StaticMapProps>) {
  const { createCanvas, loadImage } = useCanvas();

  const coordinates: [number, number][] = markers
    .filter((marker) => marker.longitude !== null && marker.latitude !== null)
    .map((marker) => [marker.longitude as number, marker.latitude as number]);

  function computeView(): View {
    if (coordinates.length === 0) {
      return { center: fallbackCenter, zoom: fallbackZoom };
    }

    const [west, south, east, north] = square(bbox(points(coordinates)));
    const centerX = (west + east) / 2;
    const centerY = (south + north) / 2;
    const half = ((east - west) / 2) * (1 + padding);

    return {
      center: [centerX, centerY],
      zoom: fitZoom(
        [centerX - half, centerY - half, centerX + half, centerY + half],
        size,
        maxZoom
      )
    };
  }

  async function drawTiles(
    context: CanvasRenderingContext2D,
    { center, zoom }: View
  ): Promise<void> {
    const scale = 2 ** zoom;
    const [centerX, centerY] = project(center, zoom);
    const originX = centerX - size / 2;
    const originY = centerY - size / 2;

    const requests: Promise<void>[] = [];
    for (
      let x = Math.floor(originX / TILE_SIZE);
      x <= Math.floor((originX + size) / TILE_SIZE);
      x++
    ) {
      for (
        let y = Math.floor(originY / TILE_SIZE);
        y <= Math.floor((originY + size) / TILE_SIZE);
        y++
      ) {
        if (y < 0 || y >= scale) {
          continue; // no vertical wrap
        }
        const column = ((x % scale) + scale) % scale; // horizontal wrap
        const url = tileUrl
          .replace('{z}', String(zoom))
          .replace('{x}', String(column))
          .replace('{y}', String(y));

        requests.push(
          loadImage(url)
            .then((image) =>
              context.drawImage(
                image,
                x * TILE_SIZE - originX,
                y * TILE_SIZE - originY
              )
            )
            // A missing tile should leave a gap, not abort the whole map.
            .catch(() => undefined)
        );
      }
    }
    await Promise.all(requests);
  }

  function drawMarkers(
    context: CanvasRenderingContext2D,
    { center, zoom }: View
  ): void {
    const [centerX, centerY] = project(center, zoom);
    const originX = centerX - size / 2;
    const originY = centerY - size / 2;

    context.fillStyle = markerColor;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    for (const coordinate of coordinates) {
      const [x, y] = project(coordinate, zoom);
      context.beginPath();
      context.arc(x - originX, y - originY, markerRadius, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    }
  }

  async function createImage(): Promise<string> {
    const { canvas, toDataURL } = createCanvas(size, size);
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    const view = computeView();

    context.fillStyle = '#eef0f5';
    context.fillRect(0, 0, size, size);
    await drawTiles(context, view);
    drawMarkers(context, view);

    return toDataURL();
  }

  return (
    <Image
      src={createImage}
      style={{ width: size, height: size, aspectRatio: 1 }}
    />
  );
}

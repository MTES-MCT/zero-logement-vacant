import { useMap } from 'react-map-gl/maplibre';

import { useMapImages, type MapImage } from '../../hooks/useMapImage';

const buildingStatusImages = [
  {
    id: 'square-fill-0',
    path: '/map/square-fill-0.png'
  },
  {
    id: 'square-fill-1',
    path: '/map/square-fill-1.png'
  },
  {
    id: 'square-fill-2',
    path: '/map/square-fill-2.png'
  },
  {
    id: 'square-fill-3',
    path: '/map/square-fill-3.png'
  },
  {
    id: 'square-fill-4',
    path: '/map/square-fill-4.png'
  },
  {
    id: 'square-fill-5',
    path: '/map/square-fill-5.png'
  }
] satisfies ReadonlyArray<MapImage>;

function BuildingStatusImages() {
  const { current: map } = useMap();

  useMapImages(map, buildingStatusImages);

  return null;
}

export default BuildingStatusImages;

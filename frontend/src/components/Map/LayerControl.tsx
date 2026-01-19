import { MapSelectorControl } from 'carte-facile';
import { useControl } from 'react-map-gl/maplibre';

function LayerControl() {
  useControl(
    () =>
      new MapSelectorControl({
        overlays: ['administrativeBoundaries', 'cadastre'],
        styles: ['simple', 'aerial']
      }),
    {
      position: 'bottom-left'
    }
  );

  // Return null because useControl handles adds the control to the map
  return null;
}

export default LayerControl;

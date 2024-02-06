import * as turf from '@turf/turf';
import { useEffect } from 'react';
import { Layer, MapRef, Source } from 'react-map-gl';

import { deserialize } from '../../utils/jsonUtils';
import { HousingStatus } from '../../models/HousingState';
import { fr } from '@codegouvfr/react-dsfr';
import fp from 'lodash/fp';
import { BUILDING_DARK } from './Icon';

interface Props<T> {
  id: string;
  map?: MapRef;
  maxZoom?: number;
  onClick?: (value: T) => void;
  points: turf.Feature<turf.Point, T>[];
  /**
   * The radius (in px) depending on the number of points in the cluster.
   * @example
   * {
   *   0: 20,
   *   5: 30
   * }
   */
  radius?: Record<number, number>;
}

const hex = fr.colors.getHex({ isDark: false });
const statuses = [
  HousingStatus.Waiting,
  HousingStatus.FirstContact,
  HousingStatus.InProgress,
  HousingStatus.Completed,
  HousingStatus.Blocked,
];
const backgroundColors = fp.zip(statuses, [
  hex.decisions.background.contrast.yellowTournesol.default,
  hex.decisions.background.contrast.blueCumulus.default,
  hex.decisions.background.contrast.orangeTerreBattue.default,
  hex.decisions.background.contrast.greenBourgeon.default,
  hex.decisions.background.contrast.purpleGlycine.default,
]);
const textColors = fp.zip(statuses, [
  hex.decisions.text.label.yellowTournesol.default,
  hex.decisions.text.label.blueCumulus.default,
  hex.decisions.text.label.orangeTerreBattue.default,
  hex.decisions.text.label.greenBourgeon.default,
  hex.decisions.text.label.purpleGlycine.default,
]);

function Clusters<T extends turf.Properties>(props: Props<T>) {
  const maxZoom = props.maxZoom ?? 16;
  // Flatten and remove the zero
  const radius = !props.radius
    ? [24, 5, 36]
    : Object.entries(props.radius).flat().splice(1).map(Number);

  const clusters = turf.featureCollection(props.points);

  useEffect(() => {
    const { map } = props;
    if (map) {
      const layers = ['unclustered-points', 'buildings'];
      layers.forEach((layer) => {
        map.on('click', layer, (e) => {
          const properties = e.features?.[0]?.properties;
          if (properties) {
            props.onClick?.(deserialize(properties) as T);
          }
        });

        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layer, function () {
          map.getCanvas().style.cursor = '';
        });
      });
    }
  }, [props, props.map]);

  return (
    <Source
      id={props.id}
      type="geojson"
      cluster
      clusterRadius={100}
      clusterMaxZoom={maxZoom}
      data={clusters}
    >
      <Layer
        id="clusters"
        type="circle"
        paint={{
          'circle-color': 'rgba(227, 227, 253, 0.8)',
          'circle-stroke-color': '#000091',
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], ...radius],
        }}
      />
      <Layer
        id="cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-size': 16,
        }}
        paint={{
          'text-color': '#000091',
        }}
      />
      <Layer
        id="unclustered-points"
        type="circle"
        filter={[
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'housingCount'], 1],
        ]}
        paint={{
          'circle-color': [
            'match',
            ['get', 'status', ['at', 0, ['get', 'housingList']]],
            // Apply a background color to the circle
            // depending on the housing status
            ...backgroundColors.flat(),
            // Default
            '#000091',
          ],
          'circle-radius': 8,
          'circle-stroke-width': 1,
          'circle-stroke-color': [
            'match',
            ['get', 'status', ['at', 0, ['get', 'housingList']]],
            // Apply a stroke color to the circle
            // depending on the housing status
            ...textColors.flat(),
            '#fff',
          ],
        }}
      />
      <Layer
        id="buildings"
        type="symbol"
        filter={[
          'all',
          ['!', ['has', 'point_count']],
          ['>=', ['get', 'housingCount'], 2],
        ]}
        layout={{
          'icon-allow-overlap': true,
          'icon-image': BUILDING_DARK,
          'icon-size': 0.75,
        }}
        paint={{
          'text-color': [
            'match',
            ['get', 'status', ['at', 0, ['get', 'housingList']]],
            // Apply a text color depending on the housing status
            ...textColors.flat(),
            '#fff',
          ],
        }}
      />
    </Source>
  );
}

export default Clusters;

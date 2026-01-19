import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { bbox, center, featureCollection } from '@turf/turf';
import { Array, Order, pipe } from 'effect';
import type maplibregl from 'maplibre-gl';
import type { FilterSpecification } from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import { Layer, Popup, Source, useMap } from 'react-map-gl/maplibre';

import { useMapLayerClick } from '~/hooks/useMapLayerClick';
import { useGetGeoStatisticsQuery } from '~/services/geo.service';

const SOURCE_ID = 'zlv-admin-boundaries';

// DSFR colors for choropleth: green (low) -> orange -> red (high)
const hex = fr.colors.getHex({ isDark: false });
const CHOROPLETH_COLORS = {
  low: hex.decisions.background.flat.greenBourgeon.default,
  mid: hex.decisions.background.flat.orangeTerreBattue.default,
  high: hex.decisions.background.flat.redMarianne.default
};

interface BoundaryProperties {
  code: string;
  nom: string;
}

interface HoverState {
  feature: BoundaryProperties;
  longitude: number;
  latitude: number;
}

const LEVELS = ['region', 'department', 'epci', 'municipality'] as const;
type Level = (typeof LEVELS)[number];

interface LayerConfig {
  id: string;
  sourceLayer: string;
  level: Level;
  parentProperty?: string;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { id: 'regions-fill', sourceLayer: 'regions', level: 'region' },
  {
    id: 'departements-fill',
    sourceLayer: 'departements',
    level: 'department',
    parentProperty: 'region'
  },
  { id: 'epcis-fill', sourceLayer: 'epcis', level: 'epci' },
  {
    id: 'communes-fill',
    sourceLayer: 'communes',
    level: 'municipality',
    parentProperty: 'epci'
  }
];

export interface AdministrativeBoundariesProps {
  level?: Level;
}

function AdministrativeBoundaries(
  props: Readonly<AdministrativeBoundariesProps>
) {
  const { housingMap: map } = useMap();
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [level, setLevel] = useState<Level>(props.level ?? 'region');
  const [parentArea, setParentArea] = useState<BoundaryProperties | null>(null);
  const { data: geoStats } = useGetGeoStatisticsQuery({ level });

  const maxHousingCount = useMemo(() => {
    if (geoStats && Array.isNonEmptyReadonlyArray(geoStats.statistics)) {
      return pipe(
        geoStats.statistics,
        Array.map((stats) => stats.housingCount),
        Array.max(Order.number)
      );
    }
    return 0;
  }, [geoStats]);

  const statsLookup = useMemo(() => {
    if (!geoStats || !Array.isNonEmptyReadonlyArray(geoStats.statistics))
      return new Map<string, number>();

    return new Map(
      geoStats.statistics.map((area) => [area.code, area.housingCount])
    );
  }, [geoStats]);

  // Apply feature states when data loads
  useEffect(() => {
    if (!map || !geoStats?.statistics?.length || maxHousingCount === 0) return;

    const sourceLayer = LAYER_CONFIGS.find(
      (config) => config.level === level
    )?.sourceLayer;
    if (!sourceLayer) return;

    const applyFeatureStates = () => {
      geoStats.statistics.forEach((stat) => {
        map.setFeatureState(
          { source: SOURCE_ID, sourceLayer, id: stat.code },
          { ratio: stat.housingCount / maxHousingCount }
        );
      });
    };

    const onSourceData = (event: maplibregl.MapSourceDataEvent) => {
      if (event.sourceId === SOURCE_ID && event.isSourceLoaded) {
        applyFeatureStates();
      }
    };

    // Apply immediately if source is loaded, otherwise wait for it
    if (map.getSource(SOURCE_ID)) {
      applyFeatureStates();
    }
    map.on('sourcedata', onSourceData);

    return () => {
      map.off('sourcedata', onSourceData);
    };
  }, [map, geoStats, maxHousingCount, level]);

  useMapLayerClick<BoundaryProperties>({
    layers: [
      'regions-fill',
      'departements-fill',
      'epcis-fill',
      'communes-fill'
    ],
    map: map,
    onClick: (value, event) => {
      if (!map || !event.features?.length) return;

      const currentIndex = LEVELS.indexOf(level);
      // Don't zoom further when at the lowest level (municipality)
      if (currentIndex >= LEVELS.length - 1) return;

      const nextLevel = LEVELS[currentIndex + 1];
      setLevel(nextLevel);
      setParentArea(value);
      console.log(value);

      const collection = featureCollection(event.features);
      const [minLng, minLat, maxLng, maxLat] = bbox(collection);
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        { padding: 16 }
      );
    },
    onMouseEnter: (value, event) => {
      if (event.features) {
        const point = center(featureCollection(event.features));
        setHoverState({
          feature: value,
          longitude: point.geometry.coordinates[0],
          latitude: point.geometry.coordinates[1]
        });
      }
    },
    onMouseLeave: () => {
      setHoverState(null);
    }
  });

  return (
    <Source
      id={SOURCE_ID}
      type="vector"
      url="https://openmaptiles.geo.data.gouv.fr/data/decoupage-administratif.json"
      promoteId="code"
    >
      {LAYER_CONFIGS.map((config) => {
        const isActive = level === config.level;
        const needsParent = config.level !== 'region';
        if (!isActive || (needsParent && !parentArea)) return null;

        const filter: FilterSpecification | undefined =
          config.parentProperty && parentArea
            ? ['==', ['get', config.parentProperty], parentArea.code]
            : undefined;

        const layerProps = {
          filter
        };

        return (
          <Layer
            key={config.id}
            id={config.id}
            type="fill"
            source={SOURCE_ID}
            source-layer={config.sourceLayer}
            {...(layerProps.filter && layerProps)}
            paint={{
              'fill-color': [
                'case',
                ['!=', ['feature-state', 'ratio'], null],
                [
                  'interpolate',
                  ['linear'],
                  ['feature-state', 'ratio'],
                  0,
                  CHOROPLETH_COLORS.low,
                  0.5,
                  CHOROPLETH_COLORS.mid,
                  1,
                  CHOROPLETH_COLORS.high
                ],
                CHOROPLETH_COLORS.low
              ],
              'fill-opacity': [
                'case',
                ['==', ['get', 'code'], hoverState?.feature.code ?? ''],
                0.8,
                0.5
              ]
            }}
          />
        );
      })}

      {hoverState && (
        <Popup
          longitude={hoverState.longitude}
          latitude={hoverState.latitude}
          closeButton={false}
          closeOnClick={false}
        >
          <Stack sx={{ px: '0.5rem' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {hoverState.feature.nom}
            </Typography>
            {statsLookup.has(hoverState.feature.code) && (
              <Typography>
                {statsLookup.get(hoverState.feature.code)} logements vacants
              </Typography>
            )}
          </Stack>
        </Popup>
      )}
    </Source>
  );
}

export default AdministrativeBoundaries;

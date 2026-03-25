import * as turf from '@turf/turf';
import { fr } from '@codegouvfr/react-dsfr';
import { mapStyles } from 'carte-facile';
import { type CSSProperties, memo, useEffect, useMemo, useState } from 'react';
import ReactiveMap, {
  NavigationControl,
  useMap,
  type ViewState,
  type ViewStateChangeEvent
} from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

import { useMapImage } from '../../hooks/useMapImage';
import {
  type Building,
  groupByBuilding,
  type HousingByBuilding
} from '../../models/Building';
import type { GeoPerimeter } from '../../models/GeoPerimeter';
import {
  hasCoordinates,
  type Housing,
  type HousingWithCoordinates
} from '../../models/Housing';
import BuildingAside from './BuildingAside';
import Clusters from './Clusters';
import LayerControl from './LayerControl';
import LegendButtonControl from './LegendButtonControl';
import MapControls from './MapControls';
import MapLegend from './MapLegend';
import Perimeters from './Perimeters';
import Points from './Points';

import 'maplibre-gl/dist/maplibre-gl.css';
import 'carte-facile/carte-facile.css';

const hex = fr.colors.getHex({ isDark: false });

const MapWrapper = styled(Box)({
  position: 'relative',
  border: `1px solid ${hex.decisions.border.default.grey.default}`,
  borderRadius: '0.25rem',
  overflow: 'hidden'
});


export interface MapProps {
  housingList?: Housing[];
  hasPerimetersFilter?: boolean;
  perimeters?: GeoPerimeter[];
  perimetersIncluded?: GeoPerimeter[];
  perimetersExcluded?: GeoPerimeter[];
  viewState?: ViewState;
  minZoom?: number;
  maxZoom?: number;
  showMapSettings?: boolean;
  style?: CSSProperties;
  onMove?: (viewState: ViewState) => void;
}

function Map(props: MapProps) {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>({
    longitude: props.viewState?.longitude ?? 2,
    latitude: props.viewState?.latitude ?? 47,
    zoom: props.viewState?.zoom ?? 5,
    bearing: 0,
    pitch: 0,
    padding: {
      left: 16,
      top: 64,
      right: 16,
      bottom: 16
    }
  });

  function onMove(event: ViewStateChangeEvent): void {
    setViewState(event.viewState);
    props.onMove?.(event.viewState);
  }

  const { housingMap: map } = useMap();

  const housingList = useMemo<HousingWithCoordinates[]>(
    () => props.housingList?.filter(hasCoordinates) ?? [],
    [props.housingList]
  );

  const buildingsById = useMemo<HousingByBuilding>(
    () => groupByBuilding(housingList),
    [housingList]
  );

  const [clusterize, setClusterize] = useState(true);
  const points = useMemo(() => {
    return Object.values(buildingsById).map((building) =>
      turf.point([building.longitude, building.latitude], building)
    );
  }, [buildingsById]);

  const perimeters = props.perimeters ?? [];
  const includedPerimeters = props.perimetersIncluded ?? [];
  const excludedPerimeters = props.perimetersExcluded ?? [];
  const [showPerimeters, setShowPerimeters] = useState(true);

  useMapImage({
    id: 'square-fill-0',
    path: '/map/square-fill-0.png'
  });
  useMapImage({
    id: 'square-fill-1',
    path: '/map/square-fill-1.png'
  });
  useMapImage({
    id: 'square-fill-2',
    path: '/map/square-fill-2.png'
  });
  useMapImage({
    id: 'square-fill-3',
    path: '/map/square-fill-3.png'
  });
  useMapImage({
    id: 'square-fill-4',
    path: '/map/square-fill-4.png'
  });
  useMapImage({
    id: 'square-fill-5',
    path: '/map/square-fill-5.png'
  });

  useEffect(() => {
    if (map && points.length > 0) {
      if (points.length === 1) {
        const [lng, lat] = points[0].geometry.coordinates as [number, number];
        map.flyTo({
          center: [lng, lat],
          zoom: 10,
          duration: 800
        });
      } else {
        const bounds = turf.bbox(turf.featureCollection(points));
        map.fitBounds(bounds as [number, number, number, number], {
          padding: 64,
          duration: 800,
          maxZoom: 10
        });
      }
    }
  }, [map, points]);

  // MapLibre GL hardcodes aria-label="Map" on the canvas element.
  // Override it after the map is ready to satisfy RGAA 1.3.
  useEffect(() => {
    if (map) {
      map.getCanvas().setAttribute('aria-label', 'Carte de localisation');
    }
  }, [map]);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  const [selected, setSelected] = useState<Building | null>(null);
  const isOpen = selected !== null;

  function select(building: Building | null) {
    if (building) {
      map?.flyTo({
        center: {
          lon: building.longitude,
          lat: building.latitude
        }
      });
      setSelected(building);
    }
  }

  return (
    <>
      <MapWrapper>
      <ReactiveMap
        {...viewState}
        attributionControl={{}}
        id="housingMap"
        mapStyle={mapStyles.simple}
        minZoom={props.minZoom}
        maxZoom={props.maxZoom}
        onMove={onMove}
        style={{
          minHeight: '600px',
          height: 'auto',
          fontFamily: 'Marianne, sans-serif',
          ...props.style
        }}
      >
        <Perimeters
          id="remaining-perimeters"
          isVisible={showPerimeters}
          map={map}
          perimeters={perimeters}
        />
        <Perimeters
          id="excluded-perimeters"
          backgroundColor={props.hasPerimetersFilter ? '#ffe9e6' : undefined}
          borderColor={props.hasPerimetersFilter ? '#ce0500' : undefined}
          isVisible={showPerimeters}
          map={map}
          perimeters={excludedPerimeters}
        />
        <Perimeters
          id="included-perimeters"
          backgroundColor={props.hasPerimetersFilter ? '#b8fec9' : undefined}
          borderColor={props.hasPerimetersFilter ? '#18753c' : undefined}
          isVisible={showPerimeters}
          map={map}
          perimeters={includedPerimeters}
        />
        {clusterize ? (
          <Clusters
            id="housing"
            points={points}
            map={map}
            selected={selected}
            onClick={select}
          />
        ) : (
          <Points
            id="housing"
            points={points}
            map={map}
            selected={selected}
            onClick={select}
          />
        )}
        <MapControls
          clusterize={clusterize}
          perimeters={showPerimeters}
          show={props.showMapSettings}
          onClusterizeChange={setClusterize}
          onPerimetersChange={setShowPerimeters}
        />
        <MapLegend
          isOpen={isLegendOpen}
          onClose={() => setIsLegendOpen(false)}
        />
        <LegendButtonControl onOpen={() => setIsLegendOpen(true)} />
        <LayerControl />
        <NavigationControl
          showCompass={false}
          showZoom
          visualizePitch={false}
        />
      </ReactiveMap>
      </MapWrapper>

      <BuildingAside
        building={selected}
        open={isOpen}
        onClose={() => {
          setSelected(null);
        }}
        onView={(housing) => {
          navigate(`/logements/${housing.id}`);
        }}
      />
    </>
  );
}

export default memo(Map);

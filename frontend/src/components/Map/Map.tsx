import { useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import ReactiveMap, {
  NavigationControl,
  useMap,
  ViewState,
  ViewStateChangeEvent
} from 'react-map-gl/maplibre';
import {
  hasCoordinates,
  Housing,
  HousingWithCoordinates
} from '../../models/Housing';
import HousingPopup from './HousingPopup';
import Clusters from './Clusters';
import {
  Building,
  groupByBuilding,
  HousingByBuilding
} from '../../models/Building';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import Perimeters from './Perimeters';
import MapControls from './MapControls';
import Points from './Points';
import { useMapImage } from '../../hooks/useMapImage';

const STYLE = {
  title: 'Carte',
  uri: 'https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json'
};

export interface MapProps {
  housingList?: Housing[];
  hasPerimetersFilter?: boolean;
  perimeters?: GeoPerimeter[];
  perimetersIncluded?: GeoPerimeter[];
  perimetersExcluded?: GeoPerimeter[];
  viewState?: ViewState;
  minZoom?: number;
  maxZoom?: number;
  onMove?: (viewState: ViewState) => void;
}

function Map(props: MapProps) {
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
  const [openPopups, setOpenPopups] = useState<Record<string, boolean>>({});

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
      const bounds = turf.bbox(turf.featureCollection(points));
      map.fitBounds(bounds as [number, number, number, number], {
        padding: 64,
        duration: 800
      });
    }
  }, [map, points]);

  function popUp(building: Building): void {
    setOpenPopups((state) => ({
      ...state,
      [building.id]: true
    }));
  }

  function popOut(building: Building) {
    return (): void => {
      setOpenPopups((state) => ({
        ...state,
        [building.id]: false
      }));
    };
  }

  const popups = Object.values(buildingsById)
    .filter((building) => openPopups[building.id])
    .map((building) => (
      <HousingPopup
        building={building}
        key={`popup-${building.id}`}
        onClose={popOut(building)}
      />
    ));

  return (
    <ReactiveMap
      {...viewState}
      attributionControl
      id="housingMap"
      mapStyle={STYLE.uri}
      onMove={onMove}
      reuseMaps
      style={{
        minHeight: '600px',
        height: 'auto',
        fontFamily: 'Marianne, sans-serif'
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
        <Clusters id="housing" points={points} map={map} onClick={popUp} />
      ) : (
        <Points id="housing" points={points} map={map} onClick={popUp} />
      )}
      {popups}
      <MapControls
        clusterize={clusterize}
        perimeters={showPerimeters}
        onClusterizeChange={setClusterize}
        onPerimetersChange={setShowPerimeters}
      />
      <NavigationControl showCompass={false} showZoom visualizePitch={false} />
    </ReactiveMap>
  );
}

export default Map;

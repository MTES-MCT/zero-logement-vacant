import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import ReactiveMap, {
  NavigationControl,
  useMap,
  ViewState,
  ViewStateChangeEvent,
} from 'react-map-gl';
import {
  hasCoordinates,
  Housing,
  HousingWithCoordinates,
} from '../../models/Housing';
import HousingPopup from './HousingPopup';
import Clusters from './Clusters';
import {
  Building,
  groupByBuilding,
  HousingByBuilding,
} from '../../models/Building';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import Perimeters from './Perimeters';
import MapControls from './MapControls';

const STYLE = {
  title: 'Carte',
  uri: 'https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json',
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
      bottom: 16,
    },
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
  console.log(Object.values(buildingsById));

  const points = useMemo(
    () =>
      Object.values(buildingsById).map((building) =>
        turf.point([building.longitude, building.latitude], building)
      ),
    [buildingsById]
  );

  const perimeters = props.perimeters ?? [];
  const includedPerimeters = props.perimetersIncluded ?? [];
  const excludedPerimeters = props.perimetersExcluded ?? [];
  const [showPerimeters, setShowPerimeters] = useState(true);

  useEffect(() => {
    if (map && !map.hasImage('building')) {
      map.loadImage('/icons/building/building-4-fill.png', (error, image) => {
        if (image) {
          map.addImage('building', image);
        }
      });
    }
  }, [map]);

  function popUp(building: Building): void {
    setOpenPopups((state) => ({
      ...state,
      [building.id]: true,
    }));
  }

  function popOut(building: Building) {
    return (): void => {
      setOpenPopups((state) => ({
        ...state,
        [building.id]: false,
      }));
    };
  }

  const popups = Object.values(buildingsById)
    .filter((building) => openPopups[building.id])
    .map((building) => (
      <HousingPopup
        key={`popup-${building.id}`}
        building={building}
        onClose={popOut(building)}
      />
    ));

  return (
    <ReactiveMap
      {...viewState}
      attributionControl={false}
      id="housingMap"
      mapLib={maplibregl}
      mapStyle={STYLE.uri}
      onMove={onMove}
      reuseMaps
      style={{
        minHeight: '600px',
        height: 'auto',
        fontFamily: 'Marianne, sans-serif',
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
      <Clusters id="housing" points={points} map={map} onClick={popUp} />
      {popups}
      <MapControls
        perimeters={showPerimeters}
        onPerimetersChange={setShowPerimeters}
      />
      <NavigationControl showCompass={false} showZoom visualizePitch={false} />
    </ReactiveMap>
  );
}

export default Map;

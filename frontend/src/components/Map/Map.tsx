import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import ReactiveMap, { NavigationControl, useMap } from 'react-map-gl';
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

const STYLE = {
  title: 'Carte',
  uri: 'https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json',
};

interface MapProps {
  housingList?: Housing[];
  lng?: number;
  lat?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

function Map(props: MapProps) {
  const options = {
    longitude: props.lng ?? 2,
    latitude: props.lat ?? 47,
    zoom: props.zoom ?? 5,
    ...props,
  };
  const padding = {
    left: 16,
    top: 64,
    right: 16,
    bottom: 16,
  };

  const { housingMap } = useMap();
  const [openPopups, setOpenPopups] = useState<Record<string, boolean>>({});

  const housingList = useMemo<HousingWithCoordinates[]>(
    () => props.housingList?.filter(hasCoordinates) ?? [],
    [props.housingList]
  );

  const buildingsById = useMemo<HousingByBuilding>(
    () => groupByBuilding(housingList),
    [housingList]
  );

  const points = useMemo(
    () =>
      Object.values(buildingsById).map((building) =>
        turf.point([building.longitude, building.latitude], building)
      ),
    [buildingsById]
  );

  useEffect(() => {
    if (!housingMap || !points) {
      return;
    }

    if (points.length) {
      const bbox = turf.bbox(turf.featureCollection(points));
      housingMap.fitBounds(bbox as [number, number, number, number]);
    }
  }, [housingMap, points]);

  useEffect(() => {
    const map = housingMap?.getMap();
    if (map && !map.hasImage('building')) {
      map.loadImage('/icons/building/building-4-fill.png', (error, image) => {
        if (image) {
          map.addImage('building', image);
        }
      });
    }
  }, [housingMap]);

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
      attributionControl={false}
      id="housingMap"
      initialViewState={options}
      mapLib={maplibregl}
      mapStyle={STYLE.uri}
      padding={padding}
      reuseMaps
      style={{ minHeight: '600px' }}
    >
      <NavigationControl showCompass={false} showZoom visualizePitch={false} />
      {points.length && (
        <Clusters
          id="housing"
          points={points}
          map={housingMap}
          onClick={popUp}
        />
      )}
      {popups}
    </ReactiveMap>
  );
}

export default Map;

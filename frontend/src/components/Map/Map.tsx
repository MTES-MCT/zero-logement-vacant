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

  const points = useMemo(
    () =>
      housingList.map((housing) =>
        turf.point([housing.longitude, housing.latitude], housing)
      ),
    [housingList]
  );

  useEffect(() => {
    if (!housingMap || !housingList) {
      return;
    }

    if (housingList.length) {
      const bbox = turf.bbox(turf.featureCollection(points));
      housingMap.fitBounds(bbox as [number, number, number, number]);
    }
  }, [housingMap, housingList, points]);

  function popUp(housing: HousingWithCoordinates): void {
    setOpenPopups((state) => ({
      ...state,
      [housing.id]: true,
    }));
  }

  function popOut(housing: HousingWithCoordinates) {
    return (): void => {
      setOpenPopups((state) => ({
        ...state,
        [housing.id]: false,
      }));
    };
  }

  const popups = housingList
    .filter((housing) => openPopups[housing.id])
    .map((housing) => (
      <HousingPopup
        key={`popup-${housing.id}`}
        housing={housing}
        onClose={popOut(housing)}
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

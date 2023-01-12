import maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import ReactiveMap, { Marker, NavigationControl, useMap } from 'react-map-gl';
import { hasCoordinates, Housing } from '../../models/Housing';
import HousingPopup from './HousingPopup';

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

  const housingList = useMemo(
    () => props.housingList?.filter(hasCoordinates),
    [props.housingList]
  );

  useEffect(() => {
    if (!housingMap || !housingList) {
      return;
    }

    const points = housingList
      .map((housing) => [housing.longitude, housing.latitude])
      .map((coords) => turf.point(coords));
    const bbox = turf.bbox(turf.featureCollection(points));
    housingMap.fitBounds(bbox as [number, number, number, number]);
  }, [housingMap, housingList]);

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
      {housingList?.map((housing) => {
        return (
          <div key={housing.id}>
            <Marker
              key={`marker-${housing.id}`}
              longitude={housing.longitude}
              latitude={housing.latitude}
              color="var(--blue-france-main-525)"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setOpenPopups((state) => ({
                  ...state,
                  [housing.id]: true,
                }));
              }}
            />
            {openPopups[housing.id] && (
              <HousingPopup
                key={`popup-${housing.id}`}
                housing={housing}
                onClose={() =>
                  setOpenPopups((state) => ({
                    ...state,
                    [housing.id]: false,
                  }))
                }
              />
            )}
          </div>
        );
      })}
    </ReactiveMap>
  );
}

export default Map;

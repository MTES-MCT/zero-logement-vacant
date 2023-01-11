// Avoid transpiling maplibre-gl because the production build yields some undefined value.
// See https://github.com/alex3165/react-mapbox-gl/issues/931
// See https://github.com/mapbox/mapbox-gl-js/issues/10565
// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
import maplibregl from '!maplibre-gl';
import { useState } from 'react';
import ReactiveMap, { Marker, NavigationControl, Popup } from 'react-map-gl';
import { Housing } from '../../models/Housing';
import OwnerHousingCard from '../OwnerHousingCard/OwnerHousingCard';

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

  const [openPopups, setOpenPopups] = useState<Record<string, boolean>>({});

  return (
    <ReactiveMap
      attributionControl={false}
      initialViewState={options}
      mapLib={maplibregl}
      mapStyle={STYLE.uri}
      padding={padding}
      style={{ minHeight: '600px' }}
    >
      <NavigationControl showCompass={false} showZoom visualizePitch={false} />
      {props.housingList?.map((housing) => {
        return (
          <div key={housing.id}>
            <Marker
              key={`marker-${housing.id}`}
              longitude={housing.longitude}
              latitude={housing.latitude}
              color="var(--blue-france-main-525)"
              onClick={() =>
                setOpenPopups({ ...openPopups, [housing.id]: true })
              }
            />
            {openPopups[housing.id] && (
              <Popup
                anchor="bottom"
                key={`popup-${housing.id}`}
                longitude={housing.longitude}
                latitude={housing.latitude}
                onClose={() =>
                  setOpenPopups({
                    ...openPopups,
                    [housing.id]: false,
                  })
                }
              >
                <OwnerHousingCard housing={housing} />
              </Popup>
            )}
          </div>
        );
      })}
    </ReactiveMap>
  );
}

export default Map;

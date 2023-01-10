import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import styles from './map.module.scss';
import { Container } from '@dataesr/react-dsfr';
import { Housing } from '../../models/Housing';

const STYLE = {
  title: 'Carte',
  uri: 'https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json',
};

type MapState = 'pending' | 'loaded';

interface MapProps {
  housingList?: Housing[];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

function Map(props: MapProps) {
  const mapContainer: null | { current: any } = useRef(null);
  const map = useRef<maplibregl.Map>();
  const [mapState] = useState<MapState>('pending');
  const [lng] = useState(2);
  const [lat] = useState(47);

  function toHousingMarker(housing: Housing): maplibregl.Marker | null {
    if (housing.longitude && housing.latitude) {
      const popup = new maplibregl.Popup().setText(housing.rawAddress[0]);
      return new maplibregl.Marker({
        color: 'var(--blue-france-main-525)',
      })
        .setLngLat([housing.longitude, housing.latitude])
        .setPopup(popup);
    }
    return null;
  }

  useEffect(() => {
    if (mapState === 'loaded' || map.current) {
      return;
    }

    map.current = new maplibregl.Map({
      attributionControl: false,
      container: mapContainer.current,
      style: STYLE.uri,
      center: [lng, lat],
      zoom: props.zoom ?? 5,
      minZoom: props.minZoom,
      maxZoom: props.maxZoom,
    });

    map.current.on('load', () => {
      map.current!.addControl(
        new maplibregl.NavigationControl({
          showZoom: true,
          showCompass: false,
        }),
        'top-right'
      );
    });
  });

  useEffect(() => {
    const markers = props.housingList
      ?.map(toHousingMarker)
      .filter((marker): marker is maplibregl.Marker => marker !== null);

    markers?.forEach((marker) => {
      marker.addTo(map.current!);
    });

    return function cleanup() {
      markers?.forEach((marker) => {
        marker.remove();
      });
    };
  }, [props.housingList]);

  return (
    <Container as="section" fluid className={styles.mapContainer}>
      <div ref={mapContainer} className={styles.map} />
    </Container>
  );
}

export default Map;

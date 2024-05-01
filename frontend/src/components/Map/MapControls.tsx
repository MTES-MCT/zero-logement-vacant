import React from 'react';
import styles from './map-controls.module.scss';
import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';

interface Props {
  clusterize: boolean;
  perimeters: boolean;
  onClusterizeChange: (checked: boolean) => void;
  onPerimetersChange: (checked: boolean) => void;
}

function MapControls(props: Props) {
  return (
    <section className={styles.controls}>
      <ToggleSwitch
        checked={props.perimeters}
        label="Afficher vos périmètres déposés"
        onChange={props.onPerimetersChange}
      />

      <GeoPerimetersModalLink />

      <hr />

      <ToggleSwitch
        checked={props.clusterize}
        label="Grouper les bâtiments"
        onChange={props.onClusterizeChange}
      />
    </section>
  );
}

export default MapControls;

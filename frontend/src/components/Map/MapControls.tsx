import React from 'react';
import styles from './map-controls.module.scss';
import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch';

interface Props {
  perimeters: boolean;
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
    </section>
  );
}

export default MapControls;

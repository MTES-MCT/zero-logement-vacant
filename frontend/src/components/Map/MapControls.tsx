import { Container } from '@dataesr/react-dsfr';
import React from 'react';

import ExtendedToggle from '../ExtendedToggle/ExtendedToggle';
import styles from './map-controls.module.scss';

interface Props {
  perimeters: boolean;
  onPerimetersChange: (checked: boolean) => void;
}

function MapControls(props: Props) {
  return (
    <Container as="section" className={styles.controls} fluid>
      <ExtendedToggle
        checked={props.perimeters}
        label="Afficher vos périmètres déposés"
        onChange={props.onPerimetersChange}
      />
    </Container>
  );
}

export default MapControls;

import { Icon, Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Popup, PopupProps } from 'react-map-gl';

import { HousingWithCoordinates, toLink } from '../../models/Housing';
import InternalLink from '../InternalLink/InternalLink';
import styles from './housing-popup.module.scss';

interface HousingPopupProps {
  housing: HousingWithCoordinates;
  onClose: PopupProps['onClose'];
}

function HousingPopup(props: HousingPopupProps) {
  function address(rawAddress: string[]) {
    return rawAddress.map((raw) => (
      <Text bold spacing="mb-0" size="md">
        {raw}
      </Text>
    ));
  }

  return (
    <Popup
      anchor="bottom"
      longitude={props.housing.longitude}
      latitude={props.housing.latitude}
      offset={32}
      onClose={props.onClose}
      maxWidth="600px"
    >
      <article>
        <header className={styles.header}>
          <span className="card-title-icon">
            <Icon name="ri-home-fill" iconPosition="center" size="lg" />
          </span>
          <div className="fr-px-2w">
            {address(props.housing.rawAddress)}
            <Text as="span" size="sm">
              Invariant fiscal : 
            </Text>
            <Text as="span">{props.housing.invariant}</Text>
          </div>
        </header>
        <section>{/* TODO */}</section>
        <footer>
          <InternalLink
            display="flex"
            isSimple
            icon="ri-arrow-right-line"
            iconSize="1x"
            to={toLink(props.housing)}
          >
            Afficher le logement
          </InternalLink>
        </footer>
      </article>
    </Popup>
  );
}

export default HousingPopup;

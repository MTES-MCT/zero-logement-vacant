import { Col, Icon, Row, Text } from '@dataesr/react-dsfr';
import React from 'react';
import { Popup, PopupProps } from 'react-map-gl';

import { HousingWithCoordinates, toLink } from '../../models/Housing';
import InternalLink from '../InternalLink/InternalLink';
import styles from './housing-popup.module.scss';
import { age } from '../../utils/dateUtils';
import Collapse from '../Collapse/Collapse';

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

  const { owner } = props.housing;

  return (
    <Popup
      anchor="bottom"
      longitude={props.housing.longitude}
      latitude={props.housing.latitude}
      offset={16}
      onClose={props.onClose}
      maxWidth="30rem"
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
        <section>
          <Row>
            <Col n="12">
              <Collapse
                title={
                  <>
                    <Icon
                      className="color-grey-625"
                      name="ri-user-fill"
                      size="lg"
                      verticalAlign="middle"
                    />
                    <Text as="span" bold spacing="mb-0">
                      {owner.fullName} {owner.birthDate && age(owner.birthDate)}
                    </Text>
                  </>
                }
                content={
                  owner.email || owner.phone ? (
                    <Row>
                      <Col n="6">
                        <Text className="zlv-label weight-400" size="sm">
                          Adresse mail
                        </Text>
                        <Text className="weight-500" size="sm" spacing="mb-0">
                          {owner.email}
                        </Text>
                      </Col>
                      <Col n="6">
                        <Text className="zlv-label weight-400" size="sm">
                          Numéro de téléphone
                        </Text>
                        <Text className="weight-500" size="sm" spacing="mb-0">
                          {owner.phone}
                        </Text>
                      </Col>
                    </Row>
                  ) : null
                }
              />
            </Col>
          </Row>
        </section>
        <footer className={styles.footer}>
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

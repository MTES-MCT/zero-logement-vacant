import { Col, Container, Icon, Row, Text } from '../_dsfr';
import { useMemo, useState } from 'react';
import { Popup, PopupProps } from 'react-map-gl';

import { HousingWithCoordinates, toLink } from '../../models/Housing';
import AppLink from '../_app/AppLink/AppLink';
import { age } from '../../utils/dateUtils';
import Collapse from '../Collapse/Collapse';
import { Building } from '../../models/Building';

import styles from './housing-popup.module.scss';
import classNames from 'classnames';
import {
  getHousingState,
  getHousingSubStatus
} from '../../models/HousingState';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';
import Button from '@codegouvfr/react-dsfr/Button';

interface HousingPopupProps {
  building: Building;
  onClose: PopupProps['onClose'];
}

function HousingPopup(props: HousingPopupProps) {
  const { building, } = props;
  const [currentHousing, setCurrentHousing] = useState(0);

  const popupClasses = classNames({
    building: building.housingCount >= 2,
  });

  const housing = useMemo<HousingWithCoordinates>(
    () => building.housingList[currentHousing],
    [building, currentHousing]
  );

  const housingState = useMemo(
    () => (housing.status ? getHousingState(housing.status) : undefined),
    [housing.status]
  );

  const housingSubState = useMemo(
    () => (housing.subStatus ? getHousingSubStatus(housing) : undefined),
    [housing]
  );

  function address(rawAddress: string[]) {
    return rawAddress.map((raw) => (
      <Text bold key={raw} spacing="mb-0" size="md">
        {raw}
      </Text>
    ));
  }

  function previousHousing(): void {
    if (currentHousing >= 1) {
      setCurrentHousing(currentHousing - 1);
    }
  }

  function nextHousing(): void {
    if (currentHousing < building.housingCount - 1) {
      setCurrentHousing(currentHousing + 1);
    }
  }

  const popupTitle = housing.owner.birthDate
    ? `${housing.owner.fullName} ${age(housing.owner.birthDate)}`
    : housing.owner.fullName;

  return (
    <Popup
      anchor="bottom"
      className={popupClasses}
      longitude={props.building.longitude}
      latitude={props.building.latitude}
      offset={16}
      onClose={props.onClose}
      maxWidth="30rem"
    >
      <article>
        <header className={styles.header}>
          <span className="card-title-icon">
            <Icon name="fr-icon-home-4-fill" iconPosition="center" size="lg" />
          </span>
          <div className="fr-px-2w">
            {address(building.rawAddress)}
            <Text as="span" className="zlv-label" size="sm">
              Invariant fiscal : 
            </Text>
            <Text as="span">{housing.invariant}</Text>
          </div>
        </header>
        <section className={styles.content}>
          {housingState && (
            <Row spacing="mb-1w">
              <Col n="12">
                <HousingStatusBadge status={housingState.status} />
                <HousingSubStatusBadge
                  status={housingState.status}
                  subStatus={housingSubState?.title}
                />
              </Col>
            </Row>
          )}
          <Row spacing="mb-2w">
            <Col n="12">
              <Collapse
                title={
                  <>
                    <Icon
                      className="color-grey-625"
                      iconPosition="left"
                      name="fr-icon-user-fill"
                      size="lg"
                    />
                    <Text as="span" bold spacing="mb-0">
                      {popupTitle}
                    </Text>
                  </>
                }
                content={
                  housing.owner.email || housing.owner.phone ? (
                    <Container as="section" fluid spacing="px-2w pt-1w pb-2w">
                      <Row>
                        <Col n="6">
                          <Text className="zlv-label weight-400" size="sm">
                            Adresse mail
                          </Text>
                          <Text className="weight-500" size="sm" spacing="mb-0">
                            {housing.owner.email}
                          </Text>
                        </Col>
                        <Col n="6">
                          <Text className="zlv-label weight-400" size="sm">
                            Numéro de téléphone
                          </Text>
                          <Text className="weight-500" size="sm" spacing="mb-0">
                            {housing.owner.phone}
                          </Text>
                        </Col>
                      </Row>
                    </Container>
                  ) : null
                }
              />
            </Col>
          </Row>
          <Row justifyContent="right" spacing="mb-2w">
            <AppLink
              isSimple
              iconId="fr-icon-arrow-right-line"
              to={toLink(housing)}
            >
              Afficher le logement
            </AppLink>
          </Row>
        </section>
        {building.housingCount >= 2 && (
          <footer className={styles.footer}>
            <Text spacing="mb-0 mr-1w">
              Logement {currentHousing + 1}/{building.housingList.length}
            </Text>
            <Button className={styles.icon} onClick={previousHousing}>
              <Icon
                name="fr-icon-arrow-left-s-line"
                iconPosition="center"
                size="xs"
              />
            </Button>
            <Button className={styles.icon} onClick={nextHousing}>
              <Icon
                name="fr-icon-arrow-right-s-line"
                iconPosition="center"
                size="xs"
              />
            </Button>
          </footer>
        )}
      </article>
    </Popup>
  );
}

export default HousingPopup;

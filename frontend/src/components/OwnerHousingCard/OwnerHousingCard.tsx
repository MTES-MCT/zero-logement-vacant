import {
  Card,
  CardDescription,
  CardTitle,
  Icon,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React from 'react';

import { getBuildingLocation, Housing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import styles from './owner-housing-card.module.scss';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';

interface OwnerHousingCardProps {
  housing: Housing;
}

function OwnerHousingCard({ housing }: OwnerHousingCardProps) {
  const buildingLocation = getBuildingLocation(housing);
  const additionalInfo = buildingLocation
    ? [
        buildingLocation.building,
        buildingLocation.entrance,
        buildingLocation.level,
        buildingLocation.local,
      ].join(', ')
    : undefined;

  const href = `/logements/${housing.id}`;

  return (
    <Card hasArrow={false} className="fr-card--no-icon" href={href} size="sm">
      <CardTitle>
        <span className="card-title-icon">
          <Icon name="ri-home-fill" iconPosition="center" size="1x" />
        </span>
        <Title as="h4" look="h6" spacing="mb-0">
          {capitalize(housing.rawAddress[0])}
        </Title>
        {housing.status !== undefined && (
          <HousingStatusBadge status={housing.status} />
        )}
      </CardTitle>
      <CardDescription className={styles.content}>
        <div>
          <Text size="sm" className="zlv-label">
            Invariant fiscal
          </Text>
          <Text className="fr-mb-0">{housing.invariant}</Text>
        </div>
        {additionalInfo && (
          <div>
            <Text size="sm" className="zlv-label">
              Complément d'adresse
            </Text>
            <Text className="fr-mb-0">{additionalInfo}</Text>
          </div>
        )}
        <div>
          <Text size="sm" className="zlv-label">
            Surface
          </Text>
          <Text className="fr-mb-0">{housing.livingArea} m²</Text>
        </div>
        <div className={styles.link}>
          <Text as="span" spacing="mb-0 mr-1w">
            Voir la fiche
          </Text>
          <Icon
            name="ri-arrow-right-line"
            size="lg"
            verticalAlign="middle"
            iconPosition="center"
          />
        </div>
      </CardDescription>
    </Card>
  );
}

export default OwnerHousingCard;

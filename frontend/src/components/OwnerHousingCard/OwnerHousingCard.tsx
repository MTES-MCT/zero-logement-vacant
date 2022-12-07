import {
  Card,
  CardDescription,
  CardTitle,
  Icon,
  Text,
  Title
} from "@dataesr/react-dsfr";
import React from 'react';

import { getBuildingLocation, Housing } from "../../models/Housing";
import { capitalize } from "../../utils/stringUtils";
import styles from "./owner-housing-card.module.scss";
import { getHousingState } from "../../models/HousingState";

interface OwnerHousingCardProps {
  housing: Housing
}

function OwnerHousingCard({ housing }: OwnerHousingCardProps) {
  const buildingLocation = getBuildingLocation(housing)
  const additionalInfo = buildingLocation
    ? [buildingLocation.building, buildingLocation.entrance, buildingLocation.level, buildingLocation.local].join(', ')
    : undefined

  const href = `/logements/${housing.id}`

  return (
    <Card hasArrow={false} className="fr-card--no-icon" href={href} size="sm">
      <CardTitle>
        <span className={styles.icon}>
          <Icon name="ri-home-fill" iconPosition="center" size="1x" />
        </span>
        <Title as="h4" look="h6" spacing="mb-0">
          {capitalize(housing.rawAddress[0])}
        </Title>
        {housing.status &&
          <div
            style={{
              color: `var(${getHousingState(housing.status).color})`,
              backgroundColor: `var(${getHousingState(housing.status).bgcolor})`
            }}
            className="fr-badge fr-badge--no-icon"
          >
            <Text size="sm" className="fr-mb-0">
              {getHousingState(housing.status).title}
            </Text>
          </div>
        }
      </CardTitle>
      <CardDescription className={styles.content}>
        <div>
          <Text size="sm" className={styles.label}>Invariant fiscal</Text>
          <Text className="fr-mb-0">{housing.invariant}</Text>
        </div>
        {additionalInfo &&
          <div>
            <Text size="sm" className={styles.label}>Complément d'adresse</Text>
            <Text className="fr-mb-0">{additionalInfo}</Text>
          </div>
        }
        <div>
          <Text size="sm" className={styles.label}>Surface</Text>
          <Text className="fr-mb-0">{housing.livingArea} m²</Text>
        </div>
        <div className={styles.link}>
          <Text as="span" spacing="mb-0 mr-1w">Voir la fiche</Text>
          <Icon name="ri-arrow-right-line" size="lg" verticalAlign="middle" iconPosition="center" />
        </div>
      </CardDescription>
    </Card>
  )
}

export default OwnerHousingCard

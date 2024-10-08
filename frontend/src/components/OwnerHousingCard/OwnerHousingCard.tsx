import { Icon, Text } from '../_dsfr';

import { getBuildingLocation, Housing } from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import styles from './owner-housing-card.module.scss';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import Card from '@codegouvfr/react-dsfr/Card';
import Typography from '@mui/material/Typography';
import { HousingStatus } from '@zerologementvacant/models';

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
        buildingLocation.local
      ].join(', ')
    : undefined;

  const to = `/logements/${housing.id}`;

  return (
    <Card
      enlargeLink
      className="fr-card--no-icon"
      linkProps={{
        to
      }}
      size="small"
      title={
        <>
          {' '}
          <Typography component="h4" variant="h6" mb={0}>
            {capitalize(housing.rawAddress[0])}
          </Typography>
          {housing.status !== undefined && (
            <HousingStatusBadge
              status={housing.status as unknown as HousingStatus}
            />
          )}
        </>
      }
      desc={
        <div className={styles.content}>
          <div>
            <Text size="sm" className="zlv-label">
              Identifiant fiscal départemental
            </Text>
            <Text className="fr-mb-0">{housing.invariant}</Text>
          </div>
          {additionalInfo && (
            <div>
              <Text size="sm" className="zlv-label">
                Complément d’adresse
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
              name="fr-icon-arrow-right-line"
              size="lg"
              verticalAlign="middle"
              iconPosition="center"
            />
          </div>
        </div>
      }
    ></Card>
  );
}

export default OwnerHousingCard;

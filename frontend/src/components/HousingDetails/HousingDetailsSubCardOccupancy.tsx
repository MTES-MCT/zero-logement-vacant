import Badge from '@codegouvfr/react-dsfr/Badge';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Typography from '@mui/material/Typography';

import { Col, Row, Text } from '../_dsfr';
import {
  getOccupancy,
  getSource,
  Housing,
  OccupancyKind,
  OccupancyKindLabels
} from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import DPE from '../DPE/DPE';
import classNames from 'classnames';
import styles from './housing-details-card.module.scss';
import { Event } from '../../models/Event';
import { getYear } from 'date-fns';
import Label from '../Label/Label';

interface Props {
  housing: Housing;
  lastOccupancyEvent?: Event;
}

function HousingDetailsCardOccupancy({ housing, lastOccupancyEvent }: Props) {
  const lastOccupancyChange = lastOccupancyEvent
    ? getYear(lastOccupancyEvent.createdAt)
    : housing.occupancy === 'V'
      ? housing.vacancyStartYear
      : undefined;

  return (
    <HousingDetailsSubCard
      title={
        <>
          <Typography
            component="h2"
            variant="h6"
            mb={1}
            className={classNames(styles.title, 'd-inline-block')}
          >
            Occupation :
          </Typography>
          <div className="fr-ml-1w d-inline-block">
            <Badge className="bg-975">
              {OccupancyKindLabels[getOccupancy(housing.occupancy)]}
            </Badge>
          </div>
          <div className="d-inline-block float-right">
            <span className="zlv-label">Occupation prévisionnelle : </span>
            <Badge className="bg-975 fr-ml-1w">
              {OccupancyKindLabels[getOccupancy(housing.occupancy)]}
            </Badge>
          </div>
        </>
      }
      hasBorder
    >
      <Row>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Dans cette situation depuis
          </Text>
          <Text spacing="mb-1w">
            {lastOccupancyChange
              ? `${
                  getYear(new Date()) - lastOccupancyChange
                } ans (${lastOccupancyChange})`
              : 'Inconnu'}
          </Text>
        </Col>
        <Col n="4">
          <Label>Source</Label>
          <p>{getSource(housing)}</p>
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Logement passoire énergétique
          </Text>
          {housing.energyConsumption ? (
            <Tag className="d-block">
              {['F', 'G'].includes(housing.energyConsumption) ? 'Oui' : 'Non'}
            </Tag>
          ) : (
            <Text spacing="mb-1w">Non renseigné</Text>
          )}
        </Col>
        <Col n="4">
          <Text size="sm" className="zlv-label">
            Ancien statut d’occupation
          </Text>
          <Text spacing="mb-1w">
            {OccupancyKindLabels[
              lastOccupancyEvent?.old.occupancy as OccupancyKind
            ] ?? 'Inconnu'}
          </Text>
        </Col>
        <Col n="4">
          {housing.occupancy === 'V' && (
            <Text size="sm" className="zlv-label">
              Taxe sur la vacance
              <Tag className="d-block">{housing.taxed ? 'Oui' : 'Non'}</Tag>
            </Text>
          )}
        </Col>
        <Col n="4">
          <div className="fr-mb-3w">
            <Text size="sm" className="zlv-label">
              Étiquette DPE représentatif (CSTB)
            </Text>
            {housing.energyConsumption ? (
              <DPE
                value={housing.energyConsumption}
                madeAt={housing.energyConsumptionAt}
              />
            ) : (
              <Text spacing="mb-1w">Non renseigné</Text>
            )}
          </div>
        </Col>
      </Row>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardOccupancy;

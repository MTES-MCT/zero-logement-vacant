import { fr } from '@codegouvfr/react-dsfr';
import Badge from '@codegouvfr/react-dsfr/Badge';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
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
import LabelNext from '../Label/LabelNext';

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

  function situationSince(occupancy: string, lastOccupancyChange: number | undefined): string {
    if (lastOccupancyChange === undefined) {
      return 'Inconnu';
    }

    const duration = getYear(new Date()) - lastOccupancyChange;

    if (duration === 0) {
      return 'Moins d’un an';
    }

    return `${duration} an${duration > 1 ? 's' : ''} (${lastOccupancyChange})`;
  }

  return (
    <HousingDetailsSubCard
      className={fr.cx('fr-mb-2w')}
      title={
        <Grid alignItems="center" container justifyContent="space-between" xs>
          <Grid>
            <Typography
              component="h2"
              variant="h6"
              sx={{ mr: 1 }}
              className={classNames(styles.title, 'd-inline-block')}
            >
              Occupation :
            </Typography>
            <Badge className="bg-975">
              {OccupancyKindLabels[getOccupancy(housing.occupancy)]}
            </Badge>
          </Grid>
          <Grid>
            <LabelNext component="h3">Occupation prévisionnelle :</LabelNext>
            <Badge className="bg-975 fr-ml-1w">
              {OccupancyKindLabels[getOccupancy(housing.occupancy)]}
            </Badge>
          </Grid>
        </Grid>
      }
      hasBorder
    >
      <Grid container rowSpacing={3} xs>
        <Grid xs={4}>
          <LabelNext component="h3">Dans cette situation depuis</LabelNext>
          <Typography>
            {situationSince(housing.occupancy, lastOccupancyChange)}
          </Typography>
        </Grid>
        <Grid xs={4}>
          <LabelNext component="h3">Source</LabelNext>
          <Typography>{getSource(housing)}</Typography>
        </Grid>
        <Grid xs={4}>
          <LabelNext component="h3">Logement passoire énergétique</LabelNext>
          {housing.energyConsumption ? (
            <Tag className="d-block">
              {['F', 'G'].includes(housing.energyConsumption) ? 'Oui' : 'Non'}
            </Tag>
          ) : (
            <Typography>Non renseigné</Typography>
          )}
        </Grid>
        {lastOccupancyEvent?.old && <Grid xs={4}>
          <LabelNext component="h3">Ancien statut d’occupation</LabelNext>
          <Typography>
            {OccupancyKindLabels[
              lastOccupancyEvent?.old.occupancy as OccupancyKind
            ] ?? 'Inconnu'}
          </Typography>
        </Grid> }
        <Grid xs={4}>
          {housing.occupancy === 'V' && (
            <>
              <LabelNext component="h3">Taxe sur la vacance</LabelNext>
              <Tag className="d-block">{housing.taxed ? 'Oui' : 'Non'}</Tag>
            </>
          )}
        </Grid>
        <Grid xs={4}>
          <LabelNext component="h3">
            Étiquette DPE représentatif (CSTB)
          </LabelNext>
          {housing.energyConsumption ? (
            <DPE
              value={housing.energyConsumption}
              madeAt={housing.energyConsumptionAt}
            />
          ) : (
            <Typography>Non renseigné</Typography>
          )}
        </Grid>
      </Grid>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardOccupancy;

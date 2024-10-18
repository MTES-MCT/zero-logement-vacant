import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { formatOwnershipKind, Housing } from '../../models/Housing';
import { cadastralClassificationOptions } from '../../models/HousingFilters';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import LabelNext from '../Label/LabelNext';

interface Props {
  housing: Housing;
  className?: string;
}

function HousingDetailsSubCardProperties(props: Props) {
  const { housing } = props;
  const cadastralClassification: string | null =
    cadastralClassificationOptions.find((option) => {
      return option.value === String(housing.cadastralClassification);
    })?.label ?? null;

  return (
    <HousingDetailsSubCard className={props.className} title="Logement" isGrey>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Identifiant fiscal national</LabelNext>
        <Typography>{housing.localId}</Typography>
      </Grid>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Invariant fiscal départemental</LabelNext>
        <Typography>{housing.invariant}</Typography>
      </Grid>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Type de propriété</LabelNext>
        <Typography>{formatOwnershipKind(housing.ownershipKind)}</Typography>
      </Grid>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Type</LabelNext>
        <Typography>{housing.housingKind}</Typography>
      </Grid>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Surface</LabelNext>
        <Typography>{housing.livingArea}</Typography>
      </Grid>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Pièces</LabelNext>
        <Typography>{housing.roomsCount}</Typography>
      </Grid>
      <Grid sx={{ mb: 1 }} xs={12}>
        <LabelNext component="h3">Classement cadastral</LabelNext>
        {cadastralClassification ? (
          <Typography>{cadastralClassification}</Typography>
        ) : null}
      </Grid>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardProperties;

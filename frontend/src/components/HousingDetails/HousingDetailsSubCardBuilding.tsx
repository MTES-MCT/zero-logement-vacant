import Grid from '@mui/material/Unstable_Grid2';
import { Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import DPE from '../DPE/DPE';
import LabelNext from '../Label/LabelNext';
import Typography from '@mui/material/Typography';

interface Props {
  housing: Housing;
}

function HousingDetailsSubCardBuilding(props: Props) {
  const { housing } = props;

  return (
    <HousingDetailsSubCard title="Immeuble" isGrey>
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Date de construction</LabelNext>
        <Typography>{housing.buildingYear}</Typography>
      </Grid>
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Nombre de logements</LabelNext>
        <Typography>{housing.buildingHousingCount}</Typography>
      </Grid>
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Taux de vacance</LabelNext>
        {housing.buildingVacancyRate ? (
          <Typography>{housing.buildingVacancyRate} %</Typography>
        ) : null}
      </Grid>
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Étiquette DPE représentatif (CSTB)</LabelNext>
        {housing.energyConsumption ? (
          <div>
            <DPE
              value={housing.energyConsumption}
              madeAt={housing.energyConsumptionAt}
            />
          </div>
        ) : (
          <Typography>Non renseigné</Typography>
        )}
      </Grid>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsSubCardBuilding;

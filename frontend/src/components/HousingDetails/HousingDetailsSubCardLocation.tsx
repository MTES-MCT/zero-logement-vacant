import Grid from '@mui/material/Unstable_Grid2';
import { getBuildingLocation, Housing } from '../../models/Housing';
import HousingDetailsSubCard from './HousingDetailsSubCard';
import { LocalityKindLabels } from '../../models/Locality';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';
import { useUser } from '../../hooks/useUser';
import Typography from '@mui/material/Typography';
import LabelNext from '../Label/LabelNext';

interface Props {
  housing: Housing;
}

function HousingDetailsCardLocation({ housing }: Props) {
  const { isVisitor } = useUser();

  return (
    <HousingDetailsSubCard title="Localisation" isGrey>
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Adresse postale</LabelNext>
        {housing.rawAddress.map((line) => (
          <Typography key={line}>{line}</Typography>
        ))}
      </Grid>
      {getBuildingLocation(housing) && (
        <Grid xs={12} sx={{ mb: 1 }}>
          <LabelNext component="h3">Complément d’adresse</LabelNext>
          <Typography>
            {[
              getBuildingLocation(housing)?.building,
              getBuildingLocation(housing)?.entrance,
              getBuildingLocation(housing)?.level,
              getBuildingLocation(housing)?.local
            ].join(', ')}
          </Typography>
        </Grid>
      )}
      {housing.localityKind && (
        <Grid xs={12} sx={{ mb: 1 }}>
          <LabelNext component="h3">Périmètres</LabelNext>
          <Typography>{LocalityKindLabels[housing.localityKind]}</Typography>
        </Grid>
      )}
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Référence cadastrale</LabelNext>
        <Typography>
          <span>{housing.cadastralReference}</span>
        </Typography>
      </Grid>
      <Grid xs={12} sx={{ mb: 1 }}>
        <LabelNext component="h3">Périmètres associés</LabelNext>
        <Typography sx={{ mb: 1 }}>
          {housing.geoPerimeters?.join(', ')}
        </Typography>

        {!isVisitor && <GeoPerimetersModalLink />}
      </Grid>
    </HousingDetailsSubCard>
  );
}

export default HousingDetailsCardLocation;

import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Tooltip from '~/Tooltip/Tooltip';
import { useUser } from '../../hooks/useUser';
import { getSource, type Housing } from '../../models/Housing';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import { useHousingEdition } from '../HousingEdition/useHousingEdition';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import OccupancyBadge from './OccupancyBadge';

export interface HousingHeaderProps {
  className?: string;
  housing: Housing | undefined;
  isLoading: boolean;
}

function HousingHeader(props: HousingHeaderProps) {
  const { editing, setEditing } = useHousingEdition();

  const { isVisitor } = useUser();

  if (!props.housing) {
    return (
      <Skeleton
        animation="wave"
        variant="rectangular"
        width="50%"
        height="8rem"
        sx={{ mb: '1.5rem' }}
      />
    );
  }

  return (
    <Stack
      component="header"
      direction="row"
      sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
    >
      <Stack className={props.className} component="section">
        <Typography component="h1" variant="h3">
          {fallback(props.housing.rawAddress.join(', '))}
        </Typography>

        <Typography
          sx={{
            color: fr.colors.decisions.text.title.grey.default,
            fontWeight: 500,
            mb: '0.5rem'
          }}
        >
          Identifiant fiscal national : {props.housing.localId}
        </Typography>

        <Stack
          direction="row"
          spacing="0.75rem"
          sx={{ alignItems: 'center', mb: '0.5rem' }}
        >
          <Typography component="span">
            Occupation :&nbsp;
            <OccupancyBadge occupancy={props.housing.occupancy} />
          </Typography>
          <Typography component="span" sx={{ display: 'inline-flex' }}>
            <Typography component="span" sx={{ mr: '0.5rem' }}>
              Statut de suivi :&nbsp;
            </Typography>
            <HousingStatusBadge inline status={props.housing.status} />
          </Typography>
          {!props.housing.subStatus ? null : (
            <Typography>{props.housing.subStatus}</Typography>
          )}
        </Stack>
        <Typography
          variant="body2"
          sx={{ color: fr.colors.decisions.text.mention.grey.default }}
        >
          Source des informations :&nbsp;
          {getSource({
            dataFileYears: props.housing.dataFileYears,
            source: props.housing.source
          })}
        </Typography>
      </Stack>

      <Stack direction="row" spacing="1rem" sx={{ alignItems: 'center' }}>
        {isVisitor ? null : (
          <>
            <Tooltip
              mode="manual"
              align="end"
              place="bottom"
              title={
                <>
                  <Typography
                    component="p"
                    variant="caption"
                    sx={{ fontWeight: 700, mb: '1rem' }}
                  >
                    Éditez les informations sur ZLV pour contribuer à la
                    fiabilisation de votre base de données !
                  </Typography>
                  <Typography component="p" variant="caption">
                    Les données mises à jour sur ZLV sont conservées d’une année
                    sur l’autre et partagées avec l’ensemble des personnes ayant
                    accès à ZLV sur votre territoire de compétences
                    (collectivités territoriales et services de l’Etat). Ces
                    données ne sont pas remontées aux services des impôts, les
                    mises à jour n’ont donc pas d’impact sur la situation
                    fiscale des logements.
                  </Typography>
                </>
              }
            />
            <Button
              size="large"
              title="Mettre à jour le logement"
              onClick={() => {
                setEditing(true);
              }}
            >
              Mettre à jour
            </Button>
            <HousingEditionSideMenu
              housing={props.housing}
              expand={editing}
              onClose={() => {
                setEditing(false);
              }}
            />
          </>
        )}
      </Stack>
    </Stack>
  );
}

function fallback(
  value: string | null | undefined,
  fallback = 'Pas d’information'
): string {
  return value ?? fallback;
}

export default HousingHeader;

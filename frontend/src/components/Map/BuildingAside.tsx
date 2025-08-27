import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCounter } from 'react-use';

import Aside, { type AsideProps } from '~/components/Aside/AsideNext';
import OccupancyBadge from '~/components/Housing/OccupancyBadge';
import HousingStatusBadge from '~/components/HousingStatusBadge/HousingStatusBadge';
import Label from '~/components/Label/LabelNext';
import AppLink from '~/components/_app/AppLink/AppLink';
import type { Building } from '~/models/Building';
import type { Housing } from '~/models/Housing';
import { useFindCampaignsQuery } from '~/services/campaign.service';

const ASIDE_WIDTH = 700;

export type BuildingAsideProps = Pick<AsideProps, 'open' | 'onClose'> & {
  building: Building | null;
  onView(housing: Housing): void;
};

function BuildingAside(props: BuildingAsideProps) {
  const { building, onView, ...rest } = props;

  const housings = building?.housingList ?? [];

  const min = 1;
  const max = building?.housingCount ?? 1;
  const [counter, { dec, inc }] = useCounter(1, max, min);
  const housing = housings.at(counter - 1);

  const establishmentCampaignsQuery = useFindCampaignsQuery();
  const campaigns = establishmentCampaignsQuery.data?.filter((campaign) => {
    return housing?.campaignIds?.includes(campaign.id);
  });

  return (
    <Aside
      {...rest}
      drawerProps={{
        sx: (theme) => ({
          zIndex: theme.zIndex.appBar + 1,
          '& .MuiDrawer-paper': {
            px: '1.5rem',
            py: '2rem',
            width: ASIDE_WIDTH
          }
        })
      }}
      header={
        !building ? null : (
          <Typography variant="h5">
            {building.rawAddress.map((line) => line)}
          </Typography>
        )
      }
      main={
        !housing ? null : (
          <Stack spacing="1.5rem">
            {max >= 2 && (
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Button
                  disabled={counter <= min}
                  iconId="fr-icon-arrow-left-line"
                  iconPosition="left"
                  priority="tertiary"
                  onClick={() => {
                    dec();
                  }}
                >
                  Logement précédent
                </Button>

                <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                  {counter} / {max}
                </Typography>

                <Button
                  disabled={counter >= max}
                  iconId="fr-icon-arrow-right-line"
                  iconPosition="right"
                  priority="tertiary"
                  onClick={() => {
                    inc();
                  }}
                >
                  Logement suivant
                </Button>
              </Stack>
            )}

            <Stack
              direction="column"
              spacing="0.75rem"
              sx={
                max >= 2
                  ? {
                      border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
                      padding: '1rem'
                    }
                  : null
              }
            >
              <Stack sx={{ alignItems: 'flex-start' }}>
                <Label>Propriétaire principal</Label>
                <AppLink isSimple to={`/proprietaires/${housing.owner.id}`}>
                  {housing.owner.fullName}
                </AppLink>
              </Stack>

              <Stack sx={{ alignItems: 'flex-start' }}>
                <Label>Occupation</Label>
                <OccupancyBadge occupancy={housing.occupancy} />
              </Stack>

              <Stack sx={{ alignItems: 'flex-start' }}>
                <Label>Campagnes</Label>
                <Stack direction="column">
                  {campaigns?.map((campaign) => (
                    <AppLink
                      key={campaign.id}
                      isSimple
                      to={`/campagnes/${campaign.id}`}
                    >
                      {campaign.title}
                    </AppLink>
                  ))}
                </Stack>
              </Stack>

              <Stack sx={{ alignItems: 'flex-start' }}>
                <Label>Statut de suivi</Label>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center' }}
                  spacing="0.5rem"
                >
                  <HousingStatusBadge status={housing.status} />
                  <Typography variant="body2">{housing.subStatus}</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        )
      }
      footer={
        <ButtonsGroup
          buttons={[
            {
              priority: 'secondary',
              children: 'Fermer',
              onClick: props.onClose
            },
            {
              priority: 'primary',
              children: 'Voir le logement',
              onClick: () => {
                if (housing) {
                  onView(housing);
                }
              }
            }
          ]}
          inlineLayoutWhen="always"
        />
      }
    />
  );
}

export default BuildingAside;

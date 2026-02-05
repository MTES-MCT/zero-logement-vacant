import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  type EnergyConsumption,
  type Occupancy
} from '@zerologementvacant/models';
import { Controller } from 'react-hook-form';

import DPE from '~/components/DPE/DPE';
import type { HousingEditionFormSchema } from '~/components/HousingEdition/HousingEditionSideMenu';
import EnergyConsumptionSelect from '~/components/HousingListFilters/EnergyConsumptionSelect';
import OccupancySelect from '~/components/HousingListFilters/OccupancySelect';
import FeatureFlagLayout from '~/layouts/FeatureFlagLayout';
import type { Housing } from '~/models/Housing';
import { useGetBuildingQuery } from '~/services/building.service';

export interface HousingEditionInformationTabProps {
  housing: Housing | null;
}

function HousingEditionInformationTab(
  props: Readonly<HousingEditionInformationTabProps>
) {
  const { housing } = props;
  const { data: building } = useGetBuildingQuery(
    housing?.buildingId ?? skipToken
  );

  return (
    <Stack component="article" spacing="1.5rem" useFlexGap>
      <Stack component="section">
        <Typography className="fr-mb-2w" component="h2" variant="h6">
          Occupation
        </Typography>

        <Controller<HousingEditionFormSchema, 'occupancy'>
          name="occupancy"
          render={({ field, fieldState }) => (
            <OccupancySelect
              label="Occupation actuelle"
              disabled={field.disabled}
              error={fieldState.error?.message}
              invalid={fieldState.invalid}
              value={field.value as Occupancy}
              onChange={field.onChange}
            />
          )}
        />

        <Controller<HousingEditionFormSchema, 'occupancyIntended'>
          name="occupancyIntended"
          render={({ field, fieldState }) => (
            <OccupancySelect
              label="Occupation prévisionnelle"
              disabled={field.disabled}
              error={fieldState.error?.message}
              invalid={fieldState.invalid}
              value={field.value as Occupancy | null}
              onChange={field.onChange}
            />
          )}
        />
      </Stack>

      <FeatureFlagLayout
        flag="actual-dpe"
        then={
          <Stack component="section" spacing="1rem" useFlexGap>
            <Typography component="h2" variant="h6">
              Étiquette énergétique
            </Typography>

            <Stack component="section" spacing="0.25rem" useFlexGap>
              <Typography>Étiquette DPE représentatif (ADEME)</Typography>

              {building?.dpe?.class ? (
                <DPE value={building.dpe.class} />
              ) : (
                'Pas d’information'
              )}
            </Stack>

            <Controller<HousingEditionFormSchema, 'actualEnergyConsumption'>
              name="actualEnergyConsumption"
              render={({ field, fieldState }) => (
                <EnergyConsumptionSelect
                  label="Étiquette DPE renseignée"
                  disabled={field.disabled}
                  error={fieldState.error?.message}
                  value={field.value as EnergyConsumption | null}
                  onChange={field.onChange}
                />
              )}
            />
          </Stack>
        }
      />
    </Stack>
  );
}

export default HousingEditionInformationTab;

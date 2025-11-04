import { ENERGY_CONSUMPTION_VALUES } from '@zerologementvacant/models';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import DPE from '../DPE/DPE';
import type { EnergyConsumption } from '@zerologementvacant/models';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type EnergyConsumptionSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<EnergyConsumption | null, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

const ENERGY_CONSUMPTION_EMPTY_OPTION = {
  value: null,
  label: 'Pas d’information'
};

function VacancyRateSelect<Multiple extends boolean = false>(
  props: EnergyConsumptionSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={[
        ENERGY_CONSUMPTION_EMPTY_OPTION.value,
        ...ENERGY_CONSUMPTION_VALUES
      ]}
      label="Étiquette DPE représentatif (CSTB)"
      getOptionLabel={(option) =>
        option === ENERGY_CONSUMPTION_EMPTY_OPTION.value ? (
          ENERGY_CONSUMPTION_EMPTY_OPTION.label
        ) : (
          <DPE value={option} />
        )
      }
    />
  );
}

export default VacancyRateSelect;

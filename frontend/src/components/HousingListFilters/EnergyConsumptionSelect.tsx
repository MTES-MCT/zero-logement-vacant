import {
  ENERGY_CONSUMPTION_VALUES,
  EnergyConsumption
} from '@zerologementvacant/models';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';
import DPE from '../DPE/DPE';

export type EnergyConsumptionSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<EnergyConsumption, Multiple>,
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

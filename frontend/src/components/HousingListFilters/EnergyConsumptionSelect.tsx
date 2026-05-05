import { ENERGY_CONSUMPTION_VALUES } from '@zerologementvacant/models';
import Select from '~/components/ui/Select/Select';
import DPE from '../DPE/DPE';
import type { EnergyConsumption } from '@zerologementvacant/models';
import type { SelectProps } from '~/components/ui/Select/Select';

export type EnergyConsumptionSelectProps<Multiple extends boolean> = Pick<
  SelectProps<EnergyConsumption | null, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'label'
  | 'multiple'
  | 'value'
  | 'onChange'
>;

const ENERGY_CONSUMPTION_EMPTY_OPTION = {
  value: null,
  label: 'Pas d’information'
};

function EnergyConsumptionSelect<Multiple extends boolean = false>(
  props: EnergyConsumptionSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      displayEmpty
      options={[
        ENERGY_CONSUMPTION_EMPTY_OPTION.value,
        ...ENERGY_CONSUMPTION_VALUES
      ]}
      emptyLabel={ENERGY_CONSUMPTION_EMPTY_OPTION.label}
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

export default EnergyConsumptionSelect;

import { findStatus } from '../../models/HousingState';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';

export type HousingSubStatusSelectProps<Multiple extends boolean> = Pick<
  SelectProps<string, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'invalid'
  | 'grouped'
  | 'multiple'
  | 'options'
  | 'value'
  | 'onChange'
  | 'onBlur'
>;

function HousingSubStatusSelect<Multiple extends boolean = false>(
  props: HousingSubStatusSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      {...(props.grouped
        ? {
            groupBy: (subStatus) => findStatus(subStatus as string).toString(),
            renderGroup: (group) => (
              <HousingStatusBadge status={Number(group)} />
            )
          }
        : {})}
      label="Sous-statut de suivi"
    />
  );
}

export default HousingSubStatusSelect;

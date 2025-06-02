import { Occupancy, OCCUPANCY_VALUES } from '@zerologementvacant/models';
import { OCCUPANCY_LABELS } from '../../models/Housing';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type OccupancySelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<Occupancy, Multiple>,
  'className' | 'disabled' | 'multiple' | 'value' | 'onChange'
> & {
  label?: string;
};

function OccupancySelect<Multiple extends boolean = false>(
  props: OccupancySelectProps<Multiple>
) {
  const { label = "Statut d’occupation", ...rest } = props;
  return (
    <AppSelectNext
      {...rest}
      getOptionLabel={(occupancy) => OCCUPANCY_LABELS[occupancy]}
      label={label}
      options={OCCUPANCY_VALUES}
    />
  );
}

export default OccupancySelect;

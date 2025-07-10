import { Occupancy, OCCUPANCY_LABELS } from '@zerologementvacant/models';
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
  const { label = 'Statut d’occupation', ...rest } = props;
  // Stick values to avoid changes of the Occupancy enum, for now
  const options: Occupancy[] = [
    Occupancy.COMMERCIAL_OR_OFFICE,
    Occupancy.DEMOLISHED_OR_DIVIDED,
    Occupancy.DEPENDENCY,
    Occupancy.OTHERS,
    Occupancy.PRIMARY_RESIDENCE,
    Occupancy.RENT,
    Occupancy.SECONDARY_RESIDENCE,
    Occupancy.SHORT_RENT,
    Occupancy.UNKNOWN,
    Occupancy.VACANT
  ];
  return (
    <AppSelectNext
      {...rest}
      getOptionLabel={(occupancy) => OCCUPANCY_LABELS[occupancy]}
      label={label}
      options={options}
    />
  );
}

export default OccupancySelect;

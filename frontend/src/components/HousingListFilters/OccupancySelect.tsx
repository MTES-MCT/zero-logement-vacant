import { Occupancy, OCCUPANCY_LABELS } from '@zerologementvacant/models';
import AppSelectNext, {
  AppSelectNextProps
} from '../_app/AppSelect/AppSelectNext';

export type OccupancySelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<Occupancy, Multiple>,
  | 'className'
  | 'disabled'
  | 'error'
  | 'invalid'
  | 'label'
  | 'multiple'
  | 'value'
  | 'onChange'
>;

function OccupancySelect<Multiple extends boolean = false>(
  props: OccupancySelectProps<Multiple>
) {
  const { label = 'Statut d’occupation', ...rest } = props;
  // Stick values to avoid changes of the Occupancy enum, for now
  const options: Occupancy[] = [
    Occupancy.VACANT,
    Occupancy.RENT,
    Occupancy.SHORT_RENT,
    Occupancy.SECONDARY_RESIDENCE,
    Occupancy.PRIMARY_RESIDENCE,
    Occupancy.DEPENDENCY,
    Occupancy.COMMERCIAL_OR_OFFICE,
    Occupancy.DEMOLISHED_OR_DIVIDED,
    Occupancy.OTHERS,
    Occupancy.UNKNOWN
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

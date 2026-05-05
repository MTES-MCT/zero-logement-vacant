import { ROOM_COUNT_VALUES } from '@zerologementvacant/models';
import type { RoomCount } from '@zerologementvacant/models';
import { ROOM_COUNT_OPTIONS } from '../../models/HousingFilters';
import Select from '~/components/ui/Select/Select';
import type { SelectProps } from '~/components/ui/Select/Select';

export type RoomCountSelectProps<Multiple extends boolean> = Pick<
  SelectProps<RoomCount, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function RoomCountSelect<Multiple extends boolean = false>(
  props: RoomCountSelectProps<Multiple>
) {
  return (
    <Select
      {...props}
      options={ROOM_COUNT_VALUES}
      label="Nombre de pièces"
      getOptionLabel={(option) => ROOM_COUNT_OPTIONS[option].label}
    />
  );
}

export default RoomCountSelect;

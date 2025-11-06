import { ROOM_COUNT_VALUES } from '@zerologementvacant/models';
import type { RoomCount } from '@zerologementvacant/models';
import { ROOM_COUNT_OPTIONS } from '../../models/HousingFilters';
import AppSelectNext from '../_app/AppSelect/AppSelectNext';
import type { AppSelectNextProps } from '../_app/AppSelect/AppSelectNext';

export type RoomCountSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<RoomCount, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function RoomCountSelect<Multiple extends boolean = false>(
  props: RoomCountSelectProps<Multiple>
) {
  return (
    <AppSelectNext
      {...props}
      options={ROOM_COUNT_VALUES}
      label="Nombre de pièces"
      getOptionLabel={(option) => ROOM_COUNT_OPTIONS[option].label}
    />
  );
}

export default RoomCountSelect;

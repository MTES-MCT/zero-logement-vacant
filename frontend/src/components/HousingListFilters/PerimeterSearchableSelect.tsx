import { GeoPerimeter } from '../../models/GeoPerimeter';
import SearchableSelectNext, {
  SearchableSelectNextProps
} from '../SearchableSelectNext/SearchableSelectNext';

export type PerimeterSearchableSelectProps<Multiple extends boolean> = Pick<
  SearchableSelectNextProps<GeoPerimeter, Multiple, false, false>,
  'label' | 'multiple' | 'options' | 'value' | 'onChange'
>;

function PerimeterSearchableSelect<Multiple extends boolean = false>(
  props: PerimeterSearchableSelectProps<Multiple>
) {
  return (
    <SearchableSelectNext
      {...props}
      disabled={!props.options.length}
      placeholder="Rechercher un périmètre"
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.kind}
      isOptionEqualToValue={(option, value) => option.id === value.id}
    />
  );
}

export default PerimeterSearchableSelect;

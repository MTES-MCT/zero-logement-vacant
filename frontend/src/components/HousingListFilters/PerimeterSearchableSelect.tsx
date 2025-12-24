import { Array, pipe } from 'effect';
import type { GeoPerimeter } from '../../models/GeoPerimeter';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';
import type { SearchableSelectNextProps } from '../SearchableSelectNext/SearchableSelectNext';

export type PerimeterSearchableSelectProps<Multiple extends boolean> = Pick<
  SearchableSelectNextProps<GeoPerimeter['kind'], Multiple, false, false>,
  'label' | 'multiple' | 'value' | 'onChange'
> & {
  options: ReadonlyArray<GeoPerimeter>;
};

function PerimeterSearchableSelect<Multiple extends boolean = false>(
  props: PerimeterSearchableSelectProps<Multiple>
) {
  const options: ReadonlyArray<string> = pipe(
    props.options,
    Array.filter((perimeter) => !!perimeter.kind?.length),
    Array.dedupeWith((a, b) => a.kind === b.kind),
    Array.map((perimeter) => perimeter.kind)
  );

  return (
    <SearchableSelectNext
      {...props}
      disabled={!props.options.length}
      placeholder="Rechercher un périmètre"
      options={options}
      isOptionEqualToValue={(option, value) => option === value}
    />
  );
}

export default PerimeterSearchableSelect;

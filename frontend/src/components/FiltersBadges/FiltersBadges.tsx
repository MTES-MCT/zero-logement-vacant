import { SelectOption } from '../../models/SelectOption';
import FilterBadge from './FilterBadge';

export interface FilterBadgesProps<Value extends string | null> {
  options: SelectOption<Value>[];
  values: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
}

function FilterBadges<Value extends string | null = string>(
  props: FilterBadgesProps<Value>
) {
  const { values, onChange, options, small }: FilterBadgesProps<Value> = {
    ...props,
    values: props.values ?? []
  };

  return (
    <>
      {options
        .filter((option) => values.includes(option.value))
        .map((option, index) => (
          <FilterBadge
            option={option}
            values={values}
            onChange={onChange}
            key={option.value + '-' + index}
            small={small}
          />
        ))}
    </>
  );
}

export default FilterBadges;

import type { SelectOption } from '../../models/SelectOption';
import FilterBadge from './FilterBadge';

export interface FilterBadgesProps<Value extends string | null> {
  options: SelectOption<Value>[];
  values: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
  isLoading?: boolean;
}

function FilterBadges<Value extends string | null = string>(
  props: FilterBadgesProps<Value>
) {
  const { values, onChange, options, small, isLoading }: FilterBadgesProps<Value> = {
    ...props,
    values: props.values ?? []
  };

  const unknownValues = values.filter(
    (value) => !options.some((option) => option.value === value)
  );
  if (unknownValues.length > 0 && !isLoading) {
    console.warn('Unknown badge values found', unknownValues);
  }

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

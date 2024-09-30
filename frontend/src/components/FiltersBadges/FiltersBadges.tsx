import { SelectOption } from '../../models/SelectOption';
import Tag from '@codegouvfr/react-dsfr/Tag';

interface FilterBadgeProps<Value extends string> {
  option: SelectOption;
  filters: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
}

function FilterBadge<Value extends string>({
  option,
  filters = [],
  onChange,
  small
}: FilterBadgeProps<Value>) {
  function onClose() {
    onChange?.(filters.filter((v) => v !== option.value));
  }

  return (
    <Tag
      nativeButtonProps={{
        onClick: onClose
      }}
      small={small}
      dismissible={onChange !== undefined}
    >
      {option.badgeLabel ?? option.label}
    </Tag>
  );
}

interface FilterBadgesProps<Value extends string> {
  options: SelectOption[];
  filters: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
  keepEmptyValue?: boolean;
}

function FilterBadges<Value extends string = string>(
  props: FilterBadgesProps<Value>
) {
  const { filters, onChange, options, small }: FilterBadgesProps<Value> = {
    ...props,
    filters: props.filters ?? []
  };
  return (
    <>
      {options
        .filter(
          (o) =>
            (props.keepEmptyValue || o.value.length) &&
            filters.includes(o.value)
        )
        .map((option, index) => (
          <FilterBadge
            option={option}
            filters={filters}
            onChange={onChange}
            key={option + '-' + index}
            small={small}
          />
        ))}

      {filters
        .filter((f) => !options.map((_) => _.value).includes(f))
        .map((filter, index) => (
          <FilterBadge
            option={{ value: filter, label: filter }}
            filters={filters}
            onChange={onChange}
            key={filter + '-' + index}
            small={small}
          />
        ))}
    </>
  );
}

export default FilterBadges;

import React from 'react';
import { SelectOption } from '../../models/SelectOption';
import Tag from '@codegouvfr/react-dsfr/Tag';

interface FilterBadgeProps {
  option: SelectOption;
  filters: string[] | undefined;
  onChange?: (value: string[]) => void;
  small?: boolean;
}

const FilterBadge = ({
  option,
  filters = [],
  onChange,
  small,
}: FilterBadgeProps) => {
  function onClose() {
    onChange?.(filters.filter((v) => v !== option.value));
  }

  return (
    <Tag
      nativeButtonProps={{
        onClick: onClose,
      }}
      small={small}
      dismissible={onChange !== undefined}
    >
      {option.badgeLabel ?? option.label}
    </Tag>
  );
};

interface FilterBadgesProps {
  options: SelectOption[];
  filters: string[] | undefined;
  onChange?: (value: string[]) => void;
  small?: boolean;
  keepEmptyValue?: boolean;
}

const FilterBadges = (props: FilterBadgesProps) => {
  const { filters, onChange, options, small }: FilterBadgesProps = {
    ...props,
    filters: props.filters ?? [],
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
};

export default FilterBadges;

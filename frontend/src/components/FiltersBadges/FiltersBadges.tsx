import React, { ComponentPropsWithoutRef } from 'react';
import { SelectOption } from '../../models/SelectOption';
import { Tag } from '@dataesr/react-dsfr';

interface FilterBadgeProps {
  option: SelectOption;
  filters: string[] | undefined;
  onChange?: (value: string[]) => void;
  small?: boolean;
}

type TagIconPosition = ComponentPropsWithoutRef<typeof Tag>['iconPosition'];

const FilterBadge = ({
  option,
  filters = [],
  onChange,
  small,
}: FilterBadgeProps) => {
  function onClose() {
    onChange?.(filters.filter((v) => v !== option.value));
  }

  const icon = onChange
    ? {
        icon: 'ri-close-line',
        iconPosition: 'right' as TagIconPosition,
      }
    : {};

  return (
    <Tag className="fr-tag--dismiss" onClick={onClose} small={small} {...icon}>
      {option.badgeLabel ?? option.label}
    </Tag>
  );
};

interface FilterBadgesProps {
  options: SelectOption[];
  filters: string[] | undefined;
  onChange?: (value: string[]) => void;
  small?: boolean;
}

const FilterBadges = (props: FilterBadgesProps) => {
  const { filters, onChange, options, small }: FilterBadgesProps = {
    ...props,
    filters: props.filters ?? [],
  };
  return (
    <>
      {options
        .filter((o) => o.value.length && filters.includes(o.value))
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

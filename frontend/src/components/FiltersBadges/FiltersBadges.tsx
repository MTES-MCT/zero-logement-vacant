import { SelectOption } from '../../models/SelectOption';
import Tag from '@codegouvfr/react-dsfr/Tag';

interface FilterBadgeProps<Value extends string | null> {
  option: SelectOption;
  values: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
}

function FilterBadge<Value extends string>(props: FilterBadgeProps<Value>) {
  function onClose() {
    if (props.values) {
      props.onChange?.(props.values.filter((v) => v !== props.option.value));
    }
  }

  return (
    <Tag
      nativeButtonProps={{
        onClick: onClose
      }}
      small={props.small}
      dismissible={props.onChange !== undefined}
    >
      {props.option.badgeLabel ?? props.option.label}
    </Tag>
  );
}

interface FilterBadgesProps<Value extends string> {
  options: SelectOption<Value>[];
  values: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
  keepEmptyValue?: boolean;
}

function FilterBadges<Value extends string = string>(
  props: FilterBadgesProps<Value>
) {
  const { values, onChange, options, small }: FilterBadgesProps<Value> = {
    ...props,
    values: props.values ?? []
  };
  return (
    <>
      {options
        .filter(
          (option) =>
            (!!props.keepEmptyValue || !!option.value.length) &&
            values.includes(option.value)
        )
        .concat(
          values
            .filter(
              (value) => !options.find((option) => option.value === value)
            )
            .map((value) => ({ value, label: value }))
        )
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

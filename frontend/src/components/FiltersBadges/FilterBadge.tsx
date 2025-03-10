import Tag from '@codegouvfr/react-dsfr/Tag';
import { SelectOption } from '../../models/SelectOption';

export interface FilterBadgeProps<Value extends string | null> {
  option: SelectOption<Value>;
  values: Value[] | undefined;
  onChange?(value: Value[]): void;
  small?: boolean;
}

function FilterBadge<Value extends string | null>(
  props: FilterBadgeProps<Value>
) {
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

export default FilterBadge;

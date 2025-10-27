import Checkbox, { type CheckboxProps } from '@codegouvfr/react-dsfr/Checkbox';
import classNames from 'classnames';
import type { ElementOf } from 'ts-essentials';

import styles from './single-checkbox.module.scss';

export type SingleCheckboxProps = Omit<
  CheckboxProps,
  'options' | 'orientation'
> & {
  option: ElementOf<CheckboxProps['options']>;
};

function SingleCheckbox(props: SingleCheckboxProps) {
  const { option, ...rest } = props;

  return (
    <Checkbox
      {...rest}
      classes={{
        ...props.classes,
        inputGroup: classNames(props.classes?.inputGroup, styles.checkbox)
      }}
      options={[option]}
      orientation="horizontal"
    />
  );
}

export default SingleCheckbox;

import { fr } from '@codegouvfr/react-dsfr';
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import type { CheckboxProps } from '@codegouvfr/react-dsfr/Checkbox';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import type { ChangeEvent } from 'react';
import type { ElementOf } from 'ts-essentials';

import type { Precision, PrecisionCategory } from '@zerologementvacant/models';
import styles from './precision-modal.module.scss';

interface PrecisionColumnProps {
  category: PrecisionCategory;
  icon: FrIconClassName | RiIconClassName;
  options: Precision[];
  value: Precision[];
  title: string;
  /**
   * @default 'checkbox'
   */
  input?: 'checkbox' | 'radio';
  onChange(event: ChangeEvent<HTMLInputElement>): void;
}

function PrecisionColumn(props: PrecisionColumnProps) {
  const Fieldset = props.input === 'radio' ? RadioButtons : Checkbox;

  return (
    <>
      <Typography sx={{ fontWeight: 700, lineHeight: '1.5rem', mb: 2 }}>
        <span
          className={classNames(fr.cx(props.icon, 'fr-mr-1w'), styles.icon)}
        />
        {props.title}
      </Typography>
      <Fieldset
        options={props.options.map(
          (option): ElementOf<CheckboxProps['options']> => ({
            label: option.label,
            nativeInputProps: {
              checked: props.value.some((value) => value.id === option.id),
              value: option.id,
              onChange: props.onChange
            }
          })
        )}
      />
    </>
  );
}

export default PrecisionColumn;

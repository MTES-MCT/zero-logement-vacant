import { fr } from '@codegouvfr/react-dsfr';
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import type { CheckboxProps } from '@codegouvfr/react-dsfr/Checkbox';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';
import { styled } from '@mui/material/styles';
import type { ElementOf } from 'ts-essentials';

import type { Precision, PrecisionCategory } from '@zerologementvacant/models';
import { NULL_PRECISION_ID } from '../../models/Precision';

const LegendContent = styled('span')({
  display: 'flex',
  alignItems: 'center',
  fontWeight: 700,
  lineHeight: '1.5rem'
});

const LegendIcon = styled('span')({
  display: 'inline-flex',
  verticalAlign: 'middle',
  color: 'var(--blue-france-113)'
});

type PrecisionColumnCommonProps = {
  category: PrecisionCategory;
  icon: FrIconClassName | RiIconClassName;
  options: ReadonlyArray<Precision>;
  title: string;
};

export type PrecisionColumnCheckboxProps = PrecisionColumnCommonProps & {
  input?: 'checkbox';
  value: ReadonlyArray<Precision>;
  onChange(value: ReadonlyArray<Precision>): void;
};

export type PrecisionColumnRadioProps = PrecisionColumnCommonProps & {
  input: 'radio';
  /**
   * @default true
   */
  showNullOption?: boolean;
  value: Precision | null;
  onChange(value: Precision | null): void;
};

export type PrecisionColumnProps =
  | PrecisionColumnCheckboxProps
  | PrecisionColumnRadioProps;

function PrecisionColumn(props: PrecisionColumnProps) {
  const isRadio = props.input === 'radio';
  const Fieldset = isRadio ? RadioButtons : Checkbox;

  // Add null option for radio inputs
  const showNullOption = isRadio ? (props.showNullOption ?? true) : false;
  const nullOption: Precision | null =
    isRadio && showNullOption
      ? {
          id: NULL_PRECISION_ID,
          label: "Pas d'information",
          category: props.category
        }
      : null;

  const allOptions = nullOption
    ? [nullOption, ...props.options]
    : props.options;

  function isOptionChecked(option: Precision): boolean {
    if (option.id === NULL_PRECISION_ID) {
      // Null option is checked when there's no selection
      return isRadio && props.value === null;
    }

    if (isRadio) {
      return props.value?.id === option.id;
    } else {
      return props.value.some((value) => value.id === option.id);
    }
  }

  function handleOptionClick(option: Precision, checked: boolean): void {
    if (isRadio) {
      // Radio button mode: always set the clicked option
      if (option.id === NULL_PRECISION_ID) {
        props.onChange(null);
      } else {
        props.onChange(option);
      }
    } else {
      // Checkbox mode: toggle
      if (checked) {
        props.onChange([...props.value, option]);
      } else {
        props.onChange(
          props.value.filter((precision) => precision.id !== option.id)
        );
      }
    }
  }

  return (
    <Fieldset
      legend={
        <LegendContent>
          <LegendIcon className={fr.cx(props.icon, 'fr-mr-1w')} />
          {props.title}
        </LegendContent>
      }
      options={allOptions.map(
        (option): ElementOf<CheckboxProps['options']> => ({
          label: option.label,
          nativeInputProps: {
            checked: isOptionChecked(option),
            onChange: () =>
              handleOptionClick(option, !isOptionChecked(option))
          }
        })
      )}
    />
  );
}

export default PrecisionColumn;

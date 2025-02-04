import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import {
  BaseSelectProps,
  Box,
  MenuItem,
  Select as MuiSelect
} from '@mui/material';
import classNames from 'classnames';
import { useId } from 'react';
import { useController } from 'react-hook-form';
import { noop } from 'ts-essentials';
import { match, Pattern } from 'ts-pattern';

import styles from './app-select-next.module.scss';

interface Option<Value> {
  id?: string;
  label: string;
  value: Value;
}

type AppSelectNextProps<Value, Multiple extends boolean | undefined> = Omit<
  BaseSelectProps<SelectValue<Value, Multiple>>,
  'multiple' | 'value'
> & {
  disabled?: boolean;
  name: string;
  options: ReadonlyArray<Option<Value>>;
  // Keep this until upgrading to MUI v6
  multiple?: Multiple;
  value?: SelectValue<Value, Multiple>;
};

type SelectValue<Value, Multiple> = Multiple extends true
  ? ReadonlyArray<Value>
  : Value | null;

function AppSelectNext<Value extends string, Multiple extends boolean = false>(
  props: AppSelectNextProps<Value, Multiple>
) {
  const labelId = `fr-label-${useId()}`;
  const selectId = `fr-select-${useId()}`;

  const multiple = props.multiple ?? false;

  // Form handling
  const { field } = useController({
    name: props.name,
    disabled: props.disabled
  });

  const isControlled = props.value !== undefined;
  const value: SelectValue<Value, Multiple> =
    props.options.length === 0 ? '' : isControlled ? props.value : field.value;
  const onChange = isControlled ? props.onChange : field.onChange;

  return (
    <Box
      className={classNames(
        fr.cx('fr-select-group', {
          [fr.cx('fr-select-group--disabled')]: props.disabled
        })
      )}
    >
      <label className="fr-label" id={labelId}>
        {props.label}
      </label>
      <MuiSelect
        classes={{
          root: fr.cx('fr-mt-1w'),
          select: classNames(
            fr.cx('fr-select', 'fr-pt-1w', 'fr-pr-5w', {
              [styles.selectDisabled]: props.disabled
            })
          ),
          icon: fr.cx('fr-hidden')
        }}
        disabled={props.disabled}
        disableUnderline
        displayEmpty
        id={selectId}
        fullWidth
        labelId={labelId}
        multiple={multiple}
        MenuProps={{
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left'
          },
          elevation: 0,
          marginThreshold: null,
          disableScrollLock: true,
          slotProps: {
            paper: {
              sx: {
                filter: 'drop-shadow(var(--raised-shadow))',
                maxHeight: '13.125rem'
              }
            }
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left'
          },
          transitionDuration: 0
        }}
        native={false}
        renderValue={(values) => {
          if (values === '') {
            return 'Sélectionnez une option';
          }

          return match(values)
            .with(Pattern.string, (value) => {
              return props.options.find((option) => option.value === value)
                ?.label;
            })
            .with(Pattern.array(Pattern.string), (values) => {
              return match((values as string[]).length)
                .with(1, () => '1 option sélectionnée')
                .with(
                  Pattern.number.int().gte(2),
                  (nb) => `${nb} options sélectionnées`
                )
                .otherwise(() => '');
            })
            .otherwise(() => '');
        }}
        value={value ?? ''}
        variant="standard"
        onChange={onChange}
      >
        {props.options.map((option) => (
          <MenuItem disableRipple key={option.value} value={option.value}>
            {!props.multiple ? (
              option.label
            ) : (
              <Checkbox
                classes={{
                  root: fr.cx('fr-mb-0'),
                  inputGroup: fr.cx('fr-mt-0')
                }}
                options={[
                  {
                    label: 'Vacant',
                    nativeInputProps: {
                      checked: (value as Value[]).some(
                        (value) => value === option.value
                      ),
                      value: 'vacant',
                      onClick: noop,
                      onChange: noop
                    }
                  }
                ]}
                orientation="vertical"
                small
              />
            )}
          </MenuItem>
        ))}
      </MuiSelect>
    </Box>
  );
}

export default AppSelectNext;

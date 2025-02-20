import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import {
  BaseSelectProps,
  Box,
  MenuItem,
  Select as MuiSelect,
  SelectChangeEvent
} from '@mui/material';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { ChangeEvent, Key, useId } from 'react';
import { useController } from 'react-hook-form';
import { match, Pattern } from 'ts-pattern';

import styles from './app-select-next.module.scss';

export type AppSelectNextProps<Value, Multiple extends boolean> = Omit<
  BaseSelectProps<SelectValue<Value, Multiple>>,
  'multiple' | 'value'
> & {
  disabled?: boolean;
  getOptionKey?(value: Value): Key;
  getOptionLabel?(value: Value): string;
  getOptionValue?(value: Value): string;
  groupBy?(value: Value): string;
  isOptionEqualToValue?(option: Value, value: Value): boolean;
  // Keep this until upgrading to MUI v6
  multiple?: Multiple;
  name: string;
  options: ReadonlyArray<Value>;
};

type SelectValue<Value, Multiple extends boolean> = Multiple extends true
  ? ReadonlyArray<Value>
  : Value | null;

function AppSelectNext<Value, Multiple extends boolean = false>(
  props: AppSelectNextProps<Value, Multiple>
) {
  const labelId = `fr-label-${useId()}`;
  const selectId = `fr-select-${useId()}`;

  const multiple = props.multiple ?? false;

  // Form handling
  const { field, fieldState } = useController({
    name: props.name,
    disabled: props.disabled
  });

  const value =
    props.options.length === 0
      ? ''
      : multiple
        ? (field.value as ReadonlyArray<Value>).map(getOptionValue)
        : getOptionValue(field.value as Value);

  function onChange(
    event: SelectChangeEvent<string | ReadonlyArray<string>>
  ): void {
    const eventValue = event.target.value;
    const value = (
      typeof eventValue === 'string' ? eventValue.split(',') : eventValue
    ).map(getOption);

    field.onChange({
      ...event,
      target: {
        ...event.target,
        value: value
      }
    });
  }

  function noop(event: ChangeEvent): void {
    event.stopPropagation();
  }

  function getOptionKey(option: Value): Key {
    return props.getOptionKey?.(option) ?? getOptionLabel(option);
  }

  function getOptionLabel(option: Value): string {
    if (props.getOptionLabel) {
      return props.getOptionLabel(option);
    }

    if (
      option !== null &&
      typeof option === 'object' &&
      'label' in option &&
      typeof option.label === 'string'
    ) {
      return option.label;
    }

    throw new Error(
      'You should provide the `getOptionLabel` prop or make sure your options are objects with a `label` property'
    );
  }

  function getOption(value: string): Value {
    const option = props.options.find(
      (option) => getOptionValue(option) === value
    );
    if (!option) {
      throw new Error(`Option with value ${value} not found`);
    }

    return option;
  }

  function getOptionValue(option: Value): string {
    return props.getOptionValue?.(option) ?? getOptionKey(option).toString();
  }

  function isOptionEqualToValue(option: Value, value: Value): boolean {
    return (
      props.isOptionEqualToValue?.(option, value) ??
      getOptionKey(option) === getOptionKey(value)
    );
  }

  return (
    <Box
      className={classNames(
        fr.cx('fr-select-group', {
          [fr.cx('fr-select-group--disabled')]: field.disabled,
          [fr.cx('fr-select-group--error')]: fieldState.invalid
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

          if (Array.isArray(values)) {
            return match(values.length)
              .with(1, () => '1 option sélectionnée')
              .with(
                Pattern.number.int().gte(2),
                (nb) => `${nb} options sélectionnées`
              )
              .otherwise(() => '');
          }

          return '';
        }}
        sx={{ width: '100%' }}
        value={value}
        variant="standard"
        onChange={onChange}
      >
        {props.options.map((option) => (
          <MenuItem
            dense
            disableRipple
            key={getOptionKey(option)}
            value={getOptionValue(option)}
          >
            {!props.multiple ? (
              getOptionLabel(option)
            ) : (
              <Checkbox
                classes={{
                  root: fr.cx('fr-mb-0'),
                  inputGroup: fr.cx('fr-mt-0')
                }}
                options={[
                  {
                    label: getOptionLabel(option),
                    nativeInputProps: {
                      checked: (value as ReadonlyArray<string>).some(
                        (value) => {
                          return isOptionEqualToValue(option, getOption(value));
                        }
                      ),
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
      {fieldState.error?.message ? (
        <Typography className={fr.cx('fr-error-text')}>
          {fieldState.error?.message}
        </Typography>
      ) : null}
    </Box>
  );
}

export default AppSelectNext;

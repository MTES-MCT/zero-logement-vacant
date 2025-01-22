import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import {
  BaseSelectProps,
  Box,
  MenuItem,
  Select as MuiSelect
} from '@mui/material';
import { useId } from 'react';
import { noop } from 'ts-essentials';
import { match, Pattern } from 'ts-pattern';
import { useController } from 'react-hook-form';

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
  const value: SelectValue<Value, Multiple> = isControlled
    ? props.value
    : field.value;
  const onChange = isControlled ? props.onChange : field.onChange;

  return (
    <Box>
      <label className="fr-label" id={labelId}>
        {props.label}
      </label>
      <MuiSelect
        classes={{
          root: fr.cx('fr-mt-1w'),
          select: fr.cx('fr-select', 'fr-pt-1w', 'fr-pr-5w'),
          icon: fr.cx('fr-hidden')
        }}
        disabled={props.disabled}
        displayEmpty
        label={props.label}
        id={selectId}
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
          sx: {
            filter: 'drop-shadow(var(--raised-shadow))',
            maxHeight: '40rem'
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left'
          },
          transitionDuration: 0
        }}
        native={false}
        renderValue={(values) => {
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
        sx={{ width: '100%' }}
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

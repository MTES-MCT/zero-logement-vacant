import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import {
  BaseSelectProps,
  Box,
  MenuItem,
  Select as MuiSelect
} from '@mui/material';
import { ReactNode, useId } from 'react';
import { noop } from 'ts-essentials';
import { match, Pattern } from 'ts-pattern';
import { useController } from 'react-hook-form';

interface Option<Value> {
  id?: string;
  label: string;
  value: Value;
}

type AppSelectNextProps<Value> = BaseSelectProps<Value> & {
  disabled?: boolean;
  name: string;
  options: ReadonlyArray<Option<Value>>;
};

function AppSelectNext<
  Multiple extends boolean = false,
  Value extends string | string[] = Multiple extends true ? string[] : string
>(props: AppSelectNextProps<Value>) {
  const labelId = `fr-label-${useId()}`;
  const selectId = `fr-select-${useId()}`;

  const multiple = props.multiple ?? false;

  // Form handling
  const { field, fieldState } = useController({
    name: props.name,
    disabled: props.disabled
  });

  const isControlled = props.value !== undefined;
  const value: Value | null = isControlled ? props.value : field.value;
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
        sx={{ width: '100%' }}
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
          }
        }}
        native={false}
        renderValue={(values) => {
          return match(values)
            .returnType<ReactNode>()
            .with(Pattern.string, (value) => {
              return props.options.find((option) => option.value === value)
                ?.label;
            })
            .with(Pattern.array(Pattern.string), (values) => {
              match(values.length).with(1, () => 'Une valeur sélectionnée');
            })
            .otherwise(() => '');
        }}
        value={value ?? ''}
        variant="standard"
        onChange={onChange}
      >
        {props.options.map((option) => (
          <MenuItem
            disableRipple
            dense
            key={option.value as Value}
            value={option.value}
          >
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

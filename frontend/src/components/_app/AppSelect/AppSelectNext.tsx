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
import { List, Set } from 'immutable';
import { ChangeEvent, Key, ReactNode, useId, useRef } from 'react';
import { match, Pattern } from 'ts-pattern';

import styles from './app-select-next.module.scss';

export type AppSelectNextProps<Value, Multiple extends boolean> = Pick<
  BaseSelectProps<SelectValue<Value, Multiple>>,
  'className' | 'label' | 'renderValue' | 'onBlur'
> & {
  disabled?: boolean;
  error?: string;
  invalid?: boolean;
  getOptionKey?(value: Value): Key;
  getOptionLabel?(value: Value): ReactNode;
  getOptionValue?(value: Value): string;
  groupBy?(value: Value): string;
  isOptionEqualToValue?(option: Value, value: Value): boolean;
  // Keep this until upgrading to MUI v6
  multiple?: Multiple;
  options: ReadonlyArray<Value>;
  renderGroup?(group: string): ReactNode;
  value: SelectValue<Value, Multiple>;
  onChange(value: SelectValue<Value, Multiple>): void;
};

type SelectValue<Value, Multiple extends boolean> = Multiple extends true
  ? Array<Value>
  : Value | null;

function AppSelectNext<Value, Multiple extends boolean = false>(
  props: AppSelectNextProps<Value, Multiple>
) {
  const ref = useRef<HTMLDivElement>(null);
  const labelId = `fr-label-${useId()}`;
  const selectId = `fr-select-${useId()}`;

  const multiple = props.multiple ?? false;

  const emptyValue = multiple ? 'Tous' : '';

  const value: SelectValue<Value, any> =
    props.options.length === 0 ? null : props.value;
  const groups = props.groupBy
    ? List(props.options).groupBy((option) => props.groupBy!(option))
    : null;

  const selectedOptions: ReadonlyArray<Value> = multiple
    ? (value as ReadonlyArray<Value>)
    : [];
  const selectedGroups: ReadonlyArray<string> = groups
    ? groups
        .filter((group) => {
          return group.every((option) => {
            return selectedOptions.some((selectedOption) =>
              isOptionEqualToValue(option, selectedOption)
            );
          });
        })
        .keySeq()
        .toArray()
    : [];
  const selected: ReadonlyArray<string> | string | null =
    value === null
      ? null
      : multiple
        ? selectedOptions.map(getOptionValue).concat(selectedGroups)
        : getOptionValue(value as Value);

  function onChange(
    event: SelectChangeEvent<string | ReadonlyArray<string>>
  ): void {
    if (!multiple) {
      const nextValue = event.target.value as string;
      props.onChange(getOption(nextValue) as SelectValue<Value, Multiple>);
      return;
    }

    const [groups, options] = Set<string>(
      event.target.value as ReadonlyArray<string>
    ).partition((value) => isOption(value));
    const diff: ReadonlyArray<string> = (selected as ReadonlyArray<string>)
      .filter((selected) => {
        return !groups.includes(selected) && !options.includes(selected);
      })
      .flatMap((selected) => {
        return isGroup(selected)
          ? getGroup(selected).map(getOptionValue).toArray()
          : selected;
      });

    const nextValue = options
      .union(groups.flatMap(getGroup).map(getOptionValue))
      .filter((option) => !diff.includes(option))
      .map(getOption)
      .toArray();
    props.onChange(nextValue as SelectValue<Value, Multiple>);
  }

  function noop(event: ChangeEvent): void {
    event.stopPropagation();
  }

  function getOptionKey(option: Value): Key {
    return props.getOptionKey?.(option) ?? String(option);
  }

  function getOptionLabel(option: Value): ReactNode {
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

    if (typeof option === 'string') {
      return option;
    }

    throw new Error(
      'You should provide the `getOptionLabel` prop or make sure your options are objects with a `label` property'
    );
  }

  function getOption(value: string): Value {
    const option = props.options.find(
      (option) => getOptionValue(option) === value
    );
    if (option === undefined) {
      throw new Error(`Option with value ${value} not found`);
    }

    return option;
  }

  function getOptionValue(option: Value): string {
    return props.getOptionValue?.(option) ?? String(getOptionKey(option));
  }

  function isOption(value: string): boolean {
    return props.options.some((option) => getOptionValue(option) === value);
  }

  function isOptionSelected(option: Value): boolean {
    return selectedOptions.some((selectedOption) =>
      isOptionEqualToValue(option, selectedOption)
    );
  }

  function isOptionEqualToValue(option: Value, value: Value): boolean {
    return (
      props.isOptionEqualToValue?.(option, value) ??
      getOptionKey(option) === getOptionKey(value)
    );
  }

  function getGroup(value: string): List<Value> {
    const group = groups?.get(value) ?? null;
    if (!group) {
      throw new Error(`Group ${value} not found`);
    }

    return group;
  }

  function isGroup(value: string): boolean {
    return !!groups && groups.has(value);
  }

  function withoutGroups(values: ReadonlyArray<string>): ReadonlyArray<string> {
    return values.filter((value) => !isGroup(value));
  }

  function isGroupSelected(group: string): boolean {
    return selectedGroups.includes(group);
  }

  function renderGroup(group: string) {
    return props.renderGroup?.(group) ?? group;
  }

  return (
    <Box
      className={classNames(
        fr.cx('fr-select-group', {
          [fr.cx('fr-select-group--disabled')]: props.disabled,
          [fr.cx('fr-select-group--error')]: props.invalid
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
          variant: 'menu',
          elevation: 0,
          marginThreshold: null,
          disableScrollLock: true,
          slotProps: {
            paper: {
              sx: {
                filter: 'drop-shadow(var(--raised-shadow))',
                maxHeight: '13.125rem',
                maxWidth: ref.current?.clientWidth
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
        ref={ref}
        renderValue={(values) => {
          if (props.renderValue) {
            return props.renderValue(values as SelectValue<Value, Multiple>);
          }

          return multiple && typeof values !== 'string'
            ? match(withoutGroups(values).length)
                .with(1, () => '1 option sélectionnée')
                .with(
                  Pattern.number.int().gte(2),
                  (nb) => `${nb} options sélectionnées`
                )
                .otherwise(() => emptyValue)
            : match(values)
                .with('', () => emptyValue)
                .otherwise((value) =>
                  getOptionLabel(getOption(value as string))
                );
        }}
        value={selected ?? ''}
        variant="standard"
        onChange={onChange}
        onBlur={props.onBlur}
      >
        {groups
          ? groups.map((options, group) =>
              [
                <MenuItem
                  key={group}
                  value={group}
                  dense
                  disableRipple
                  classes={{
                    selected: styles.selected
                  }}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor:
                      fr.colors.decisions.background.default.grey.default,
                    whiteSpace: 'normal'
                  }}
                >
                  <Checkbox
                    classes={{
                      root: fr.cx('fr-mb-0'),
                      inputGroup: fr.cx('fr-mt-0')
                    }}
                    options={[
                      {
                        label: renderGroup(group),
                        nativeInputProps: {
                          checked: isGroupSelected(group),
                          onClick: noop,
                          onChange: noop
                        }
                      }
                    ]}
                    orientation="vertical"
                    small
                  />
                </MenuItem>
              ].concat(
                ...options.map((option) => (
                  <MenuItem
                    dense
                    disableRipple
                    key={getOptionKey(option)}
                    value={getOptionValue(option)}
                    sx={{
                      whiteSpace: 'normal'
                    }}
                  >
                    {!props.multiple ? (
                      <Typography variant="body2">
                        {getOptionLabel(option)}
                      </Typography>
                    ) : (
                      <Checkbox
                        classes={{
                          root: fr.cx('fr-mb-0'),
                          inputGroup: fr.cx('fr-mt-0')
                        }}
                        options={[
                          {
                            label: (
                              <Typography
                                sx={{ mt: '0.125rem' }}
                                variant="body2"
                              >
                                {getOptionLabel(option)}
                              </Typography>
                            ),
                            nativeInputProps: {
                              checked: isOptionSelected(option),
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
                ))
              )
            )
          : props.options.map((option) => (
              <MenuItem
                dense
                disableRipple
                key={getOptionKey(option)}
                value={getOptionValue(option)}
                sx={{
                  whiteSpace: 'normal'
                }}
              >
                {!props.multiple ? (
                  <Typography variant="body2">
                    {getOptionLabel(option)}
                  </Typography>
                ) : (
                  <Checkbox
                    classes={{
                      root: fr.cx('fr-mb-0'),
                      inputGroup: fr.cx('fr-mt-0')
                    }}
                    options={[
                      {
                        label: (
                          <Typography sx={{ mt: '0.125rem' }} variant="body2">
                            {getOptionLabel(option)}
                          </Typography>
                        ),
                        nativeInputProps: {
                          checked: isOptionSelected(option),
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
      {props.error ? (
        <Typography className={fr.cx('fr-error-text')}>
          {props.error}
        </Typography>
      ) : null}
    </Box>
  );
}

export default AppSelectNext;

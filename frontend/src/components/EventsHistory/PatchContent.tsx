import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Option, pipe, Record } from 'effect';
import { identity } from 'effect/Function';
import { ReactNode, useId } from 'react';
import { match } from 'ts-pattern';

export interface PatchContentProps<T extends object> {
  values: T;
  filterKey?(key: keyof T): boolean;
  renderKey?: Partial<{
    [K in keyof T]: ReactNode;
  }>;
  renderValue?: Partial<{
    [K in keyof T]: (value: T[K]) => ReactNode;
  }>;
  showKeys?: boolean;
}

function PatchContent<T extends object>(props: PatchContentProps<T>) {
  const { filterKey } = props;

  const label = useId();

  function renderKey<K extends keyof T>(key: K): ReactNode {
    // Invoke the user-defined key mapper if it exists
    const mapped = props.renderKey?.[key];

    return match(mapped)
      .when(
        (value) => typeof value === 'number' || typeof value === 'string',
        (primitive) => (
          <Typography
            sx={{
              color: fr.colors.decisions.text.title.grey.default,
              fontWeight: 500
            }}
          >
            {primitive}
          </Typography>
        )
      )
      .otherwise((component) => component);
  }

  function renderValue<K extends keyof T>(value: T[K], key: K): ReactNode {
    // Invoke the user-defined value mapper if it exists
    const mapped = props.renderValue?.[key]?.(value) ?? String(value);

    return match(mapped)
      .when(
        (value) => typeof value === 'number' || typeof value === 'string',
        (primitive) => <Typography>{primitive}</Typography>
      )
      .otherwise((component) => component);
  }

  return pipe(
    props.values,
    !filterKey
      ? identity
      : Record.filterMap((_, key) =>
          filterKey(key) ? Option.some(key) : Option.none()
        ),
    Record.collect((key, value) => {
      const id = props.showKeys ? `${label}-${String(key)}` : undefined;
      return (
        <Stack key={String(key)}>
          {!props.showKeys ? null : <span id={id}>{renderKey(key)}</span>}
          <span aria-labelledby={id}>{renderValue(value, key)}</span>
        </Stack>
      );
    })
  );
}

export default PatchContent;

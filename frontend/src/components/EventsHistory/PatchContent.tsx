import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isDefined, isNotNull } from '@zerologementvacant/utils';
import fp from 'lodash/fp';
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

  const patch: (obj: T) => ReactNode = fp.pipe(
    fp.toPairs,
    (pairs) =>
      !filterKey ? pairs : pairs.filter(([key]) => filterKey(key as keyof T)),
    fp.filter(([, value]) => isDefined(value) && isNotNull(value)),
    fp.map(([key, value]: [keyof T, T[keyof T]]) => {
      const id = props.showKeys ? `${label}-${String(key)}` : undefined;
      return (
        <Stack key={String(key)}>
          {!props.showKeys ? null : <span id={id}>{renderKey(key)}</span>}
          <span aria-labelledby={id}>{renderValue(value, key)}</span>
        </Stack>
      );
    })
  );

  return patch(props.values);
}

export default PatchContent;

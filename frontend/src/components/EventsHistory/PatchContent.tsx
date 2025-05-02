import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isDefined, isNotNull } from '@zerologementvacant/utils';
import fp from 'lodash/fp';
import { ReactNode } from 'react';

export interface PatchContentProps<T extends object> {
  values: T;
  filterKey?(key: keyof T): boolean;
  mapKey?: Partial<{
    [K in keyof T]: ReactNode;
  }>;
  mapValue?: Partial<{
    [K in keyof T]: (value: T[K]) => ReactNode;
  }>;
  showKeys?: boolean;
}

function PatchContent<T extends object>(props: PatchContentProps<T>) {
  function mapKey<K extends keyof T>(key: K): ReactNode {
    // Invoke the user-defined key mapper if it exists
    const mapped = props.mapKey?.[key] ?? String(key);
    return typeof mapped !== 'string' ? (
      mapped
    ) : (
      <Typography
        sx={{
          color: fr.colors.decisions.text.title.grey.default,
          fontWeight: 500
        }}
      >
        {mapped}
      </Typography>
    );
  }

  function mapValue<K extends keyof T>(value: T[K], key: K): ReactNode {
    // Invoke the user-defined value mapper if it exists
    const mapped = props.mapValue?.[key]?.(value) ?? String(value);
    return typeof mapped !== 'string' ? (
      mapped
    ) : (
      <Typography>{mapped}</Typography>
    );
  }

  const patch: (obj: T) => ReactNode = fp.pipe(
    fp.toPairs,
    (pairs) =>
      !props.filterKey
        ? pairs
        : pairs.filter(([key]) => props.filterKey!(key as keyof T)),
    fp.filter(([, value]) => isDefined(value) && isNotNull(value)),
    fp.map(([key, value]: [keyof T, T[keyof T]]) => (
      <Stack key={String(key)}>
        {!props.showKeys ? null : mapKey(key)}
        {mapValue(value, key)}
      </Stack>
    ))
  );

  return patch(props.values);
}

export default PatchContent;

export type VariableOption =
  | '{{owner.fullName}}'
  | '{{owner.rawAddress}}'
  | '{{owner.additionalAddress}}'
  | '{{housing.rawAddress}}'
  | '{{housing.localId}}'
  | '{{housing.geoCode}}';

interface Replacement {
  owner: {
    fullName?: string;
    rawAddress?: string[];
    additionalAddress?: string;
  };
  housing: {
    rawAddress?: string[];
    localId?: string;
    geoCode?: string;
  };
}

export function replaceVariables(
  str: string,
  replacement: Replacement
): string {
  return str
    .replaceAll('{{owner.fullName}}', replacement.owner.fullName ?? '')
    .replaceAll(
      '{{owner.rawAddress}}',
      replacement.owner.rawAddress?.join(', ') ?? ''
    )
    .replaceAll(
      '{{owner.additionalAddress}}',
      replacement.owner.additionalAddress ?? ''
    )
    .replaceAll(
      '{{housing.rawAddress}}',
      replacement.housing.rawAddress?.join(', ') ?? ''
    )
    .replaceAll('{{housing.localId}}', replacement.housing.localId ?? '')
    .replaceAll('{{housing.geoCode}}', replacement.housing.geoCode ?? '');
}

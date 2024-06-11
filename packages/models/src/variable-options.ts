export type VariableOption =
  | '{{owner.fullName}}'
  | '{{housing.rawAddress}}'
  | '{{housing.localId}}'
  | '{{housing.cadastralReference}}'
  | '{{housing.housingKind}}'
  | '{{housing.livingArea}}'
  | '{{housing.roomsCount}}'
  | '{{housing.buildingYear}}'
  | '{{housing.energyConsumption}}';

const VARIABLES_OPTIONS: VariableOption[] = [
  '{{owner.fullName}}',
  '{{housing.rawAddress}}',
  '{{housing.localId}}',
  '{{housing.cadastralReference}}',
  '{{housing.housingKind}}',
  '{{housing.livingArea}}',
  '{{housing.roomsCount}}',
  '{{housing.buildingYear}}',
  '{{housing.energyConsumption}}',
];

export function isVariableOption(value: string): value is VariableOption {
  return VARIABLES_OPTIONS.find((option) => option === value) !== undefined;
}

interface Replacement {
  owner: {
    fullName?: string;
  };
  housing: {
    rawAddress?: string[];
    localId?: string;
    cadastralReference?: string;
    housingKind?: string;
    livingArea?: number;
    roomsCount?: number;
    buildingYear?: number;
    energyConsumption?: string;
  };
}

export function replaceVariables(
  str: string,
  replacement: Replacement,
): string {
  return str
    .replaceAll('{{owner.fullName}}', replacement.owner.fullName ?? '')
    .replaceAll(
      '{{housing.rawAddress}}',
      replacement.housing.rawAddress?.join(', ') ?? '',
    )
    .replaceAll('{{housing.localId}}', replacement.housing.localId ?? '')
    .replaceAll(
      '{{housing.cadastralReference}}',
      replacement.housing.cadastralReference ?? '',
    )
    .replaceAll(
      '{{housing.housingKind}}',
      replacement.housing.housingKind ?? '',
    )
    .replaceAll(
      '{{housing.livingArea}}',
      replacement.housing.livingArea?.toString()?.concat('m²') ?? '',
    )
    .replaceAll(
      '{{housing.roomsCount}}',
      replacement.housing.roomsCount?.toString() ?? '',
    )
    .replaceAll(
      '{{housing.buildingYear}}',
      replacement.housing.buildingYear?.toString() ?? '',
    )
    .replaceAll(
      '{{housing.energyConsumption}}',
      replacement.housing.energyConsumption ?? '',
    );
}

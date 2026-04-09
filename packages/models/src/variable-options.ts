import { match } from 'ts-pattern';

import { EnergyConsumption } from './EnergyConsumption';
import { HousingKind } from './HousingKind';

const VARIABLES_OPTIONS = [
  '{{owner.fullName}}',
  '{{housing.rawAddress}}',
  '{{housing.localId}}',
  '{{housing.invariant}}',
  '{{housing.cadastralReference}}',
  '{{housing.plotId}}',
  '{{housing.housingKind}}',
  '{{housing.livingArea}}',
  '{{housing.roomsCount}}',
  '{{housing.buildingYear}}',
  '{{housing.vacancyStartYear}}',
  '{{housing.energyConsumption}}'
];

export type VariableOption = (typeof VARIABLES_OPTIONS)[number];

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
    invariant?: string;
    cadastralReference?: string | null;
    plotId?: string | null;
    housingKind?: string | null;
    livingArea?: number | null;
    roomsCount?: number | null;
    buildingYear?: number | null;
    vacancyStartYear?: number | null;
    energyConsumption?: EnergyConsumption | null;
  };
}

export function replaceVariables(
  str: string,
  replacement: Replacement
): string {
  return str
    .replaceAll('{{owner.fullName}}', replacement.owner.fullName ?? '')
    .replaceAll(
      '{{housing.rawAddress}}',
      replacement.housing.rawAddress?.join(', ') ?? ''
    )
    .replaceAll('{{housing.localId}}', replacement.housing.localId ?? '')
    .replaceAll('{{housing.invariant}}', replacement.housing.invariant ?? '')
    .replaceAll(
      '{{housing.cadastralReference}}',
      replacement.housing.cadastralReference ?? ''
    )
    .replaceAll('{{housing.plotId}}', replacement.housing.plotId ?? '')
    .replaceAll(
      '{{housing.housingKind}}',
      match(replacement.housing.housingKind)
        .with(null, undefined, () => '')
        .with(HousingKind.APARTMENT, () => 'appartement')
        .with(HousingKind.HOUSE, () => 'maison')
        .otherwise((value) => {
          throw new Error(`Unknown housing kind: ${value}`);
        })
    )
    .replaceAll(
      '{{housing.livingArea}}',
      replacement.housing.livingArea?.toString()?.concat('m²') ?? ''
    )
    .replaceAll(
      '{{housing.roomsCount}}',
      replacement.housing.roomsCount?.toString() ?? ''
    )
    .replaceAll(
      '{{housing.buildingYear}}',
      replacement.housing.buildingYear?.toString() ?? ''
    )
    .replaceAll(
      '{{housing.vacancyStartYear}}',
      replacement.housing.vacancyStartYear?.toString() ?? ''
    )
    .replaceAll(
      '{{housing.energyConsumption}}',
      replacement.housing.energyConsumption ?? ''
    );
}

import { Equivalence, pipe, Record, Struct } from 'effect';
import { DataFileYear } from './DataFileYear';
import { EnergyConsumption } from './EnergyConsumption';
import { HousingKind } from './HousingKind';
import { HousingStatus } from './HousingStatus';
import { Occupancy } from './Occupancy';
import { OwnerDTO } from './OwnerDTO';

// TODO: complete this type
export interface HousingDTO {
  id: string;
  invariant: string;
  localId: string;
  rawAddress: string[];
  geoCode: string;
  campaignIds?: string[] | null;
  longitude: number | null;
  latitude: number | null;
  cadastralClassification: number | null;
  cadastralReference: string | null;
  uncomfortable: boolean;
  vacancyStartYear: number | null;
  housingKind: HousingKind;
  roomsCount: number | null;
  livingArea: number | null;
  buildingYear: number | null;
  taxed: boolean | null;
  /**
   * @deprecated See {@link dataFileYears}
   */
  dataYears: number[];
  dataFileYears: DataFileYear[];
  beneficiaryCount: number | null;
  buildingLocation: string | null;
  rentalValue: number | null;
  ownershipKind: string | null;
  status: HousingStatus;
  subStatus: string | null;
  energyConsumption: EnergyConsumption | null;
  energyConsumptionAt: Date | null;
  occupancy: Occupancy;
  occupancyIntended: Occupancy | null;
  source: HousingSource | null;
  owner: OwnerDTO;
  mutationDate: string | null;
  lastMutationDate: string | null;
  lastTransactionDate: string | null;
  lastTransactionValue: number | null;
}

export type HousingPayloadDTO = Pick<HousingDTO, 'localId'>;

export type HousingUpdatePayloadDTO =
  // Required keys
  Pick<HousingDTO, 'status' | 'occupancy'> & {
    // Nullable keys
    subStatus: string | null;
    occupancyIntended: Occupancy | null;
  };

export function diff(
  before: HousingUpdatePayloadDTO,
  after: HousingUpdatePayloadDTO
): [Partial<HousingUpdatePayloadDTO>, Partial<HousingUpdatePayloadDTO>] {
  const changed = pipe(
    {
      status: Equivalence.strict<HousingStatus>(),
      subStatus: Equivalence.strict<string | null>(),
      occupancy: Equivalence.strict<Occupancy>(),
      occupancyIntended: Equivalence.strict<Occupancy | null>()
    },
    Record.map((equivalence: Equivalence.Equivalence<any>, key) =>
      equivalence(before[key], after[key])
    ),
    Record.filter((equals) => !equals),
    Record.keys
  ) as ReadonlyArray<keyof HousingUpdatePayloadDTO>;

  return [Struct.pick(before, ...changed), Struct.pick(after, ...changed)];
}

export interface HousingCountDTO {
  housing: number;
  owners: number;
}

export const HOUSING_SOURCE_VALUES = [
  'lovac',
  'datafoncier-manual',
  'datafoncier-import'
] as const;

export type HousingSource = (typeof HOUSING_SOURCE_VALUES)[number];

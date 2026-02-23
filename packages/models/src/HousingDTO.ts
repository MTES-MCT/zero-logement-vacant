import { Equivalence, pipe, Record, Struct } from 'effect';
import { DataFileYear } from './DataFileYear';
import { EnergyConsumption } from './EnergyConsumption';
import { HousingKind } from './HousingKind';
import { HousingStatus } from './HousingStatus';
import { MutationType } from './Mutation';
import { Occupancy } from './Occupancy';
import { OwnerDTO } from './OwnerDTO';
import type { HousingFiltersDTO } from './HousingFiltersDTO';
import type { CadastralClassification } from './CadastralClassification';
import type { DocumentDTO } from './DocumentDTO';
import type { Precision } from './Precision';

export interface HousingDTO {
  id: string;
  invariant: string;
  localId: string;
  rawAddress: string[];
  geoCode: string;
  campaignIds?: string[] | null;
  longitude: number | null;
  latitude: number | null;
  cadastralClassification: CadastralClassification | null;
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
  /**
   * The actual energy consumption class of the housing.
   * Prefilled from the building energy consumption
   * when the building is an individual house.
   *
   * NB: this can be edited by users.
   */
  actualEnergyConsumption: EnergyConsumption | null;
  /**
   * @deprecated Use BuildingDTO.dpe.class instead
   */
  energyConsumption: EnergyConsumption | null;
  /**
   * @deprecated Use BuildingDTO.dpe.doneAt instead
   */
  energyConsumptionAt: Date | null;
  occupancy: Occupancy;
  occupancyIntended: Occupancy | null;
  source: HousingSource | null;
  owner: OwnerDTO | null;
  readonly lastMutationType: MutationType | null;
  lastMutationDate: string | null;
  lastTransactionDate: string | null;
  lastTransactionValue: number | null;
  plotId: string | null;
  /**
   * The surface of the plot associated with the housing, in square meters.
   */
  plotArea: number | null;
}

export type HousingPayloadDTO = Pick<HousingDTO, 'localId'>;

export type HousingUpdatePayloadDTO =
  // Required keys
  Pick<HousingDTO, 'status' | 'occupancy' | 'actualEnergyConsumption'> & {
    // Nullable keys
    subStatus: string | null;
    occupancyIntended: Occupancy | null;
  };

export type HousingBatchUpdatePayload = {
  /**
   * The filters to search for housings.
   */
  filters: HousingFiltersDTO;
  occupancy?: Occupancy;
  occupancyIntended?: Occupancy;
  status?: HousingStatus;
  subStatus?: string;
  note?: string;
  precisions?: Precision['id'][];
  documents?: DocumentDTO['id'][];
};

interface Diff<A> {
  before: Partial<A>;
  after: Partial<A>;
  changed: ReadonlyArray<keyof A>;
}

export function diffHousingUpdatePayload(
  before: HousingUpdatePayloadDTO,
  after: HousingUpdatePayloadDTO
): Diff<HousingUpdatePayloadDTO> {
  const changed = pipe(
    {
      status: Equivalence.strict<HousingStatus>(),
      subStatus: Equivalence.strict<string | null>(),
      occupancy: Equivalence.strict<Occupancy>(),
      occupancyIntended: Equivalence.strict<Occupancy | null>(),
      actualEnergyConsumption: Equivalence.strict<EnergyConsumption | null>()
    },
    Record.map((equivalence: Equivalence.Equivalence<any>, key) =>
      equivalence(before[key], after[key])
    ),
    Record.filter((equals) => !equals),
    Record.keys
  ) as ReadonlyArray<keyof HousingUpdatePayloadDTO>;

  return {
    before: Struct.pick(before, ...changed),
    after: Struct.pick(after, ...changed),
    changed: changed
  };
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

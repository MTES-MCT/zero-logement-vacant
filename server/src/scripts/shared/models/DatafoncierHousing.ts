import {
  DatafoncierHousing,
  HousingKind,
  HousingSource,
  HousingStatus,
  toOccupancy
} from '@zerologementvacant/models';
import { parse } from 'date-fns';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import { HousingRecordApi, OwnershipKindsApi } from '~/models/HousingApi';

export const toHousingRecordApi = fp.curry(
  (
    additionalData: AdditionalData,
    housing: DatafoncierHousing
  ): HousingRecordApi => {
    // Should be erased later in the chain
    // by the original housing id if it exists
    const housingId = uuidv4();
    return {
      id: housingId,
      invariant: housing.invar,
      localId: housing.idlocal,
      rawAddress: [`${housing.dnvoiri} ${housing.dvoilib}`, housing.idcomtxt],
      geoCode: housing.idcom,
      // TODO: no data
      uncomfortable: false,
      housingKind:
        housing.dteloctxt === 'MAISON'
          ? HousingKind.HOUSE
          : HousingKind.APARTMENT,
      roomsCount: housing.npiece_p2,
      livingArea: housing.stoth,
      buildingYear: housing.jannath,
      taxed: false,
      // The data in `df_housing_nat` and `df_owners_nat` is from 2023
      dataYears: [2023],
      dataFileYears: [
        additionalData.source === 'lovac' ? 'lovac-2023' : 'ff-2023-locatif'
      ],
      buildingLocation: `${housing.dnubat}${housing.descc}${housing.dniv}${housing.dpor}`,
      ownershipKind: housing.ctpdl as OwnershipKindsApi,
      status: HousingStatus.NEVER_CONTACTED,
      occupancy: toOccupancy(housing.ccthp),
      occupancyRegistered: toOccupancy(housing.ccthp),
      source: additionalData.source,
      mutationDate: parse(housing.jdatatv, 'ddMMyyyy', new Date()).toJSON(),
      energyConsumption: null,
      energyConsumptionAt: null,
      cadastralClassification: null,
      lastMutationDate: parse(housing.jdatatv, 'ddMMyyyy', new Date()).toJSON(),
      lastTransactionDate: null,
      lastTransactionValue: null
    };
  }
);

interface AdditionalData {
  source: HousingSource;
}

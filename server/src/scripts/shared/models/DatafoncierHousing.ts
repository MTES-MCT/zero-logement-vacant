import fp from 'lodash/fp';
import {
  HousingRecordApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from '~/models/HousingApi';
import { v4 as uuidv4 } from 'uuid';
import { ReferenceDataFileYear } from '~/repositories/housingRepository';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { DatafoncierHousing, HousingSource } from '@zerologementvacant/shared';
import { parse } from 'date-fns';

export const toHousingRecordApi = fp.curry(
  (
    additionalData: AdditionalData,
    housing: DatafoncierHousing,
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
      housingKind: housing.dteloctxt === 'MAISON' ? 'MAISON' : 'APPART',
      roomsCount: housing.npiece_p2,
      livingArea: housing.stoth,
      buildingYear: housing.jannath,
      taxed: false,
      dataFileYears: [`${ReferenceDataFileYear + 1}`],
      buildingLocation: `${housing.dnubat}${housing.descc}${housing.dniv}${housing.dpor}`,
      ownershipKind: housing.ctpdl as OwnershipKindsApi,
      status: HousingStatusApi.NeverContacted,
      occupancy: housing.ccthp as OccupancyKindApi,
      occupancyRegistered: housing.ccthp as OccupancyKindApi,
      source: additionalData.source,
      mutationDate: parse(housing.jdatatv, 'ddMMyyyy', new Date()),
      plotId: housing.idpar,
    };
  },
);

interface AdditionalData {
  source: HousingSource;
}

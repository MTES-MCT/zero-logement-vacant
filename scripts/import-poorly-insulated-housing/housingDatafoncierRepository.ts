import { StreamOptions } from '../../server/repositories/housingStreamRepository';
import {
  HousingRecordApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from '../../server/models/HousingApi';
import datafoncierService, {
  HousingDTO,
} from '../../server/services/datafoncierService';
import { v4 as uuidv4 } from 'uuid';
import { ReferenceDataYear } from '../../server/repositories/housingRepository';
import { HousingStatusApi } from '../../server/models/HousingStatusApi';
import Stream = Highland.Stream;

class HousingDatafoncierStream {
  stream(opts: StreamOptions): Stream<HousingRecordApi> {
    return datafoncierService.housing.stream(opts).map(toHousingRecordApi);
  }
}

function toHousingRecordApi(housing: HousingDTO): HousingRecordApi {
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
    housingKind: housing.dteloc === '1' ? 'MAISON' : 'APPART',
    roomsCount: housing.npiece_p2,
    livingArea: housing.stoth,
    buildingYear: housing.jannath,
    taxed: false,
    dataYears: [ReferenceDataYear + 1],
    buildingLocation: `${housing.dnubat}${housing.descc}${housing.dniv}${housing.dpor}`,
    ownershipKind: housing.ctpdl as OwnershipKindsApi,
    status: HousingStatusApi.NeverContacted,
    occupancy: OccupancyKindApi.Rent,
  };
}

function createHousingDatafoncierStream(): HousingDatafoncierStream {
  return new HousingDatafoncierStream();
}

export default createHousingDatafoncierStream;

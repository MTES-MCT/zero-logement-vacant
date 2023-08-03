import { StreamOptions } from '../../server/repositories/housingStreamRepository';
import { HousingRecordApi } from '../../server/models/HousingApi';
import datafoncierService from '../../server/services/datafoncierService';
import { toHousingRecordApi } from '../../server/models/HousingDatafoncier';
import Stream = Highland.Stream;

class HousingDatafoncierStream {
  stream(opts: StreamOptions): Stream<HousingRecordApi> {
    return datafoncierService.housing.stream(opts).map(toHousingRecordApi);
  }
}

function createHousingDatafoncierStream(): HousingDatafoncierStream {
  return new HousingDatafoncierStream();
}

export default createHousingDatafoncierStream;

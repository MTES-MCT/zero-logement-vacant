import {
  HousingStreamRepository,
  StreamOptions,
} from '../../server/repositories/housingStreamRepository';
import { HousingApi } from '../../server/models/HousingApi';
import datafoncierService from '../../server/services/datafoncierService';
import Stream = Highland.Stream;

class HousingDatafoncierStream implements HousingStreamRepository {
  stream(opts: StreamOptions): Stream<HousingApi> {
    return datafoncierService.housing.stream(opts);
  }
}

function createHousingDatafoncierStream(): HousingStreamRepository {
  return new HousingDatafoncierStream();
}

export default createHousingDatafoncierStream;

import { OwnerStreamRepository, StreamOptions } from './ownerStreamRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import datafoncierService from '../../server/services/datafoncierService';
import Stream = Highland.Stream;

class OwnerDatafoncierStream implements OwnerStreamRepository {
  stream(opts: StreamOptions): Stream<OwnerApi> {
    return datafoncierService.owners.stream(opts);
  }
}

function createOwnerDatafoncierStream(): OwnerStreamRepository {
  return new OwnerDatafoncierStream();
}

export default createOwnerDatafoncierStream;

import Stream = Highland.Stream;

import { OwnerApi } from '../../server/models/OwnerApi';

export interface StreamOptions {
  geoCodes: string[];
}

export interface OwnerStreamRepository {
  stream(opts: StreamOptions): Stream<OwnerApi>;
}

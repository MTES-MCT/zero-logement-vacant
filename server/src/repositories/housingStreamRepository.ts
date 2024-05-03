import Stream = Highland.Stream;

import { HousingApi } from '~/models/HousingApi';

export interface StreamOptions {
  geoCodes: string[];
}

export interface HousingStreamRepository {
  stream(opts: StreamOptions): Stream<HousingApi>;
}

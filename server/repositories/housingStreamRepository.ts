import Stream = Highland.Stream;

import { HousingApi } from '../models/HousingApi';

export interface StreamOptions {
  geoCodes: string[];
  /**
   * The number of items to return by iteration.
   * @default 500
   */
  batch?: number;
}

export interface HousingStreamRepository {
  stream(opts: StreamOptions): Stream<HousingApi>;
}

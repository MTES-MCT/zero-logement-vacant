import {
  prependOriginalHousing,
  housingStream,
  parseLocalId,
} from './housing-stream';
import merger from './merger';

export function run() {
  housingStream()
    .group((housing) => parseLocalId(housing.localId))
    .through(prependOriginalHousing)
    .through(merger.merge());
}

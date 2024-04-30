import { v4 as uuidv4 } from 'uuid';
import { genDatafoncierOwner } from '../../../server/test/testFixtures';
import { ownerImporter, processOwner } from '../ownerImporter';
import {
  formatOwnerApi,
  Owners,
} from '../../../server/repositories/ownerRepository';
import {
  OwnerMatchDBO,
  OwnerMatches,
} from '../../../server/repositories/ownerMatchRepository';
import { OwnerApi } from '../../../server/models/OwnerApi';
import { DatafoncierOwner, toOwnerApi } from '../../shared';
import highland from 'highland';
import { formatElapsed, timer } from '../../shared/elapsed';
import { logger } from '../../../server/utils/logger';
import randomstring from 'randomstring';
import progress from 'cli-progress';
import Stream = Highland.Stream;

const createProgressBas = () => {
  return new progress.SingleBar(
    {
      etaBuffer: 1000,
      etaAsynchronousUpdate: true,
      fps: 10,
      format:
        '{bar} | {percentage}% | ETA: {eta_formatted} | {value}/{total} housing',
    },
    progress.Presets.shades_classic
  );
};

describe('Import owners', () => {
  describe('Benchmark', () => {
    it('should process a large amount of data', (done) => {
      function* createGenerator(n: number) {
        let i = 0;
        while (i < n) {
          yield genDatafoncierOwner();
          i++;
        }
      }

      const iterations = 5_000;
      const generator = createGenerator(iterations);
      const stream = highland<DatafoncierOwner>(generator);
      const stop = timer();
      const progressBarOwner = createProgressBas();
      const ownerImporterForHighland = (stream: Stream<DatafoncierOwner>) =>
        ownerImporter(progressBarOwner, stream);
      stream.through(ownerImporterForHighland).done(() => {
        const elapsed = stop();
        logger.info(`Done in ${formatElapsed(elapsed)}.`);
        done();
      });
      // It should succeed within 2 minutes
    }, 120_000 /* A specific timeout */);
  });

  describe('Importer', () => {
    it('should save one owner and two matches if the same owner appears twice in the stream', async () => {
      const a = genDatafoncierOwner();
      const b = { ...a, idpersonne: randomstring.generate(8) };

      const progressBarOwner = createProgressBas();
      const ownerImporterForHighland = (stream: Stream<DatafoncierOwner>) =>
        ownerImporter(progressBarOwner, stream);
      await highland<DatafoncierOwner>([a, b])
        .through(ownerImporterForHighland)
        .collect()
        .toPromise(Promise);

      const matches = await OwnerMatches().whereIn('idpersonne', [
        a.idpersonne,
        b.idpersonne,
      ]);
      expect(matches).toHaveLength(2);
      expect(matches).toSatisfyAll<OwnerMatchDBO>(
        (match) => match.owner_id === matches[0].owner_id
      );
    });
  });

  describe('processOwner', () => {
    const datafoncierOwner = genDatafoncierOwner();

    describe('If there is no link between Datafoncier and ZLV owners', () => {
      describe('If the DF owner cannot be matched with a ZLV owner', () => {
        it('should create a new owner', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.owner).toBeDefined();
          expect(actual.owner?.fullName).toBe(datafoncierOwner.ddenom);
        });

        it('should link the DF owner to the newly created owner', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.match).toBeDefined();
          expect(actual.match?.idpersonne).toBe(datafoncierOwner.idpersonne);
          expect(actual.match?.owner_id).toBeString();
        });
      });

      describe('Otherwise it can be matched to an existing owner', () => {
        const zlvOwner: OwnerApi = {
          ...toOwnerApi(datafoncierOwner),
          id: uuidv4(),
        };

        beforeEach(async () => {
          await Owners().insert(formatOwnerApi(zlvOwner));
        });

        it('should create the link', async () => {
          const actual = await processOwner(datafoncierOwner);

          expect(actual.match).toStrictEqual({
            idpersonne: datafoncierOwner.idpersonne,
            owner_id: zlvOwner.id,
          });
        });
      });
    });
  });
});

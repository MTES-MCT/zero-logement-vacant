import { v4 as uuidv4 } from 'uuid';

import conflictRepository, {
  ConflictDBO,
  Conflicts,
  formatConflictApi,
  formatOwnerConflictApi,
  OwnerConflictRecordDBO,
  OwnerConflicts,
} from '../conflictRepository';
import { ConflictApi, OwnerConflictApi } from '~/models/ConflictApi';
import { genOwnerApi, genOwnerConflictApi } from '../../../test/testFixtures';
import { formatOwnerApi, Owners } from '../../ownerRepository';

describe('Conflict repository', () => {
  describe('Conflicts', () => {
    describe('formatConflictApi', () => {
      it('should format a conflict', () => {
        const conflict: ConflictApi<any> = {
          id: uuidv4(),
          createdAt: new Date(),
          existing: '123',
          replacement: '456',
        };

        const actual = formatConflictApi(conflict);

        expect(actual).toStrictEqual<ConflictDBO>({
          id: conflict.id,
          created_at: conflict.createdAt,
        });
      });
    });
  });

  describe('Owner conflicts', () => {
    const repository = conflictRepository.owners;

    describe('find', async () => {
      const geoCode = '67268';
      const conflicts: OwnerConflictApi[] = await Promise.all(Array.from({ length: 5 }, async () =>
        await genOwnerConflictApi(geoCode),
      ));

      beforeAll(async () => {
        await Conflicts().insert(conflicts.map(formatConflictApi));
        const owners = conflicts
          .map((conflict) => conflict.existing)
          .map(formatOwnerApi);
        await Owners().insert(owners);
        await OwnerConflicts().insert(conflicts.map(formatOwnerConflictApi));
      });

      it('should return owner conflicts', async () => {
        const actual = await repository.find();

        expect(actual).toBeArrayOfSize(conflicts.length);
      });

      it('should sort conflicts by id', async () => {
        const actual = await repository.find();

        expect(actual).toBeSortedBy('id');
      });
    });

    describe('save', async () => {
      const geoCode = '67268';
      const conflict = await genOwnerConflictApi(geoCode);

      beforeAll(async () => {
        await Owners().insert(formatOwnerApi(conflict.existing));
        await repository.save(conflict);
      });

      it('should create a conflict', async () => {
        const actual = await Conflicts().where({ id: conflict.id }).first();
        expect(actual).toBeDefined();
      });

      it('should create an owner conflict linked to the conflict entity', async () => {
        const actual = await OwnerConflicts()
          .where({ conflict_id: conflict.id })
          .first();
        expect(actual).toMatchObject<Partial<OwnerConflictRecordDBO>>({
          conflict_id: conflict.id,
          owner_id: conflict.existing.id,
        });
      });
    });

    describe('formatOwnerConflictApi', () => {
      it('should format a owner conflict', async () => {
        const geoCode = '67268';
        const conflict: OwnerConflictApi = {
          id: uuidv4(),
          createdAt: new Date(),
          existing: await genOwnerApi(geoCode),
          replacement: await genOwnerApi(geoCode),
        };

        const actual = formatOwnerConflictApi(conflict);

        expect(actual).toStrictEqual<OwnerConflictRecordDBO>({
          conflict_id: conflict.id,
          owner_id: conflict.existing.id,
          replacement: formatOwnerApi(conflict.replacement),
        });
      });
    });
  });
});

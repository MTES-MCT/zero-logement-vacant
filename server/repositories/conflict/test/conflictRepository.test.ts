import { v4 as uuidv4 } from 'uuid';

import conflictRepository, {
  ConflictDBO,
  Conflicts,
  formatConflictApi,
  formatOwnerConflictApi,
  OwnerConflictRecordDBO,
  OwnerConflicts,
} from '../conflictRepository';
import { ConflictApi, OwnerConflictApi } from '../../../models/ConflictApi';
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

    describe('find', () => {
      const conflicts: OwnerConflictApi[] = new Array(5)
        .fill(0)
        .map(genOwnerConflictApi);

      beforeEach(async () => {
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

    describe('save', () => {
      const conflict: OwnerConflictApi = genOwnerConflictApi();

      beforeEach(async () => {
        await Owners().insert(formatOwnerApi(conflict.existing));
      });

      it('should create a conflict', async () => {
        await repository.save(conflict);

        const actual = await Conflicts().where({ id: conflict.id }).first();
        expect(actual).toBeDefined();
      });

      it('should create an owner conflict linked to the conflict entity', async () => {
        await repository.save(conflict);

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
      it('should format a owner conflict', () => {
        const conflict: OwnerConflictApi = {
          id: uuidv4(),
          createdAt: new Date(),
          existing: genOwnerApi(),
          replacement: genOwnerApi(),
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

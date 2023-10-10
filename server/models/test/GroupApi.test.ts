import { toGroupDTO } from '../GroupApi';
import { genGroupApi } from '../../test/testFixtures';
import { User1 } from '../../../database/seeds/test/003-users';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { GroupDTO } from '../../../shared/models/GroupDTO';

describe('GroupApi', () => {
  describe('toGroupDTO', () => {
    it('should return specific fields', () => {
      const group = genGroupApi(User1, Establishment1);

      const actual = toGroupDTO(group);

      expect(actual).toStrictEqual<GroupDTO>({
        id: group.id,
        title: group.title,
        description: group.description,
        housingCount: group.housingCount,
        ownerCount: group.ownerCount,
        createdAt: group.createdAt.toJSON(),
        createdBy: group.createdBy
          ? {
              id: group.createdBy.id,
              email: group.createdBy.email,
              firstName: group.createdBy.firstName,
              lastName: group.createdBy.lastName,
              role: group.createdBy.role,
              activatedAt: group.createdBy.activatedAt?.toJSON(),
              establishmentId: group.createdBy.establishmentId,
            }
          : undefined,
        archivedAt: null,
      });
    });
  });
});

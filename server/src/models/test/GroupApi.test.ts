import { GroupDTO } from '@zerologementvacant/models';
import { toGroupDTO } from '~/models/GroupApi';
import {
  genEstablishmentApi,
  genGroupApi,
  genUserApi
} from '~/test/testFixtures';

describe('GroupApi', () => {
  describe('toGroupDTO', () => {
    it('should return specific fields', () => {
      const establishment = genEstablishmentApi();
      const user = genUserApi(establishment.id);
      const group = genGroupApi(user, establishment);

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
              phone: group.createdBy.phone,
              position: group.createdBy.position,
              timePerWeek: group.createdBy.timePerWeek,
              updatedAt: group.createdBy.updatedAt,
              lastAuthenticatedAt: group.createdBy.lastAuthenticatedAt,
              role: group.createdBy.role,
              activatedAt: group.createdBy.activatedAt,
              establishmentId: group.createdBy.establishmentId
            }
          : undefined,
        archivedAt: null
      });
    });
  });
});

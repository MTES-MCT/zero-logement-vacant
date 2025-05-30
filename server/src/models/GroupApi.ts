import { toUserDTO, UserApi } from './UserApi';
import { GroupDTO } from '@zerologementvacant/models';
import fp from 'lodash/fp';

export interface GroupApi
  extends Omit<GroupDTO, 'createdAt' | 'createdBy' | 'archivedAt'> {
  userId: string;
  createdAt: Date;
  /**
   * The full user corresponding to the userId.
   */
  createdBy?: UserApi;
  establishmentId: string;
  exportedAt: Date | null;
  archivedAt: Date | null;
}

export function toGroupDTO(group: GroupApi): GroupDTO {
  return {
    ...fp.pick(
      ['id', 'title', 'description', 'housingCount', 'ownerCount'],
      group
    ),
    createdAt: group.createdAt.toJSON(),
    createdBy: group.createdBy ? toUserDTO(group.createdBy) : undefined,
    archivedAt: group.archivedAt?.toJSON() ?? null
  };
}

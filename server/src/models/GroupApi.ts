import { GroupDTO } from '@zerologementvacant/models';
import { Struct } from 'effect';

import { toUserDTO, UserApi } from './UserApi';

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
    ...Struct.pick(
      group,
      'id',
      'title',
      'description',
      'housingCount',
      'ownerCount'
    ),
    createdAt: group.createdAt.toJSON(),
    createdBy: group.createdBy ? toUserDTO(group.createdBy) : undefined,
    archivedAt: group.archivedAt?.toJSON() ?? null
  };
}

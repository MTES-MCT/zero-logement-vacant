import { fromUserDTO, User } from './User';
import { GroupDTO } from '../../../shared/models/GroupDTO';

export interface Group {
  id: string;
  title: string;
  description: string;
  housingCount: number;
  ownerCount: number;
  createdAt: Date;
  createdBy?: User;
  archivedAt: Date | null;
}

export const fromGroupDTO = (group: GroupDTO): Group => ({
  id: group.id,
  title: group.title,
  description: group.description,
  housingCount: group.housingCount,
  ownerCount: group.ownerCount,
  createdAt: new Date(group.createdAt),
  createdBy: group.createdBy ? fromUserDTO(group.createdBy) : undefined,
  archivedAt: group.archivedAt ? new Date(group.archivedAt) : null,
});

import { fromUserDTO, User } from './User';
import { GroupDTO } from '../../../shared/models/GroupDTO';

export interface Group {
  id: string;
  title: string;
  description: string;
  housingCount: number;
  ownerCount: number;
  createdAt: Date;
  createdBy: User;
}

export const fromGroupDTO = (group: GroupDTO): Group => ({
  id: group.id,
  title: group.title,
  description: group.description,
  housingCount: group.housingCount,
  ownerCount: group.ownerCount,
  createdAt: new Date(group.createdAt),
  createdBy: fromUserDTO(group.createdBy),
});

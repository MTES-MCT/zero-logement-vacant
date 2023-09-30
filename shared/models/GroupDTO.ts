import { UserDTO } from './UserDTO';

export interface GroupDTO {
  id: string;
  title: string;
  description: string;
  housingCount: number;
  ownerCount: number;
  createdAt: string;
  createdBy: UserDTO;
}

export interface GroupPayload extends Pick<GroupDTO, 'title' | 'description'> {
  /**
   * Housing ids linked to the group
   */
  housingIds: string[];
}

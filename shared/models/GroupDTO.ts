import { UserDTO } from './UserDTO';
import { HousingFiltersApi } from '../../server/models/HousingFiltersApi';

export interface GroupDTO {
  id: string;
  title: string;
  description: string;
  housingCount: number;
  ownerCount: number;
  createdAt: string;
  createdBy?: UserDTO;
}

export interface GroupPayloadDTO
  extends Pick<GroupDTO, 'title' | 'description'> {
  housing: {
    all: boolean;
    ids: string[];
    filters: Omit<HousingFiltersApi, 'groupId'>;
  };
}

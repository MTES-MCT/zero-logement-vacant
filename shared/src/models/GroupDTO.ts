import { UserDTO } from './UserDTO';

export interface GroupDTO {
  id: string;
  title: string;
  description: string;
  housingCount: number;
  ownerCount: number;
  createdAt: string;
  createdBy?: UserDTO;
  archivedAt: string | null;
}

export interface GroupPayloadDTO
  extends Pick<GroupDTO, 'title' | 'description'> {
  housing: {
    all: boolean;
    ids: string[];
    // TODO: should be HousingFiltersDTO
    filters: any;
  };
}

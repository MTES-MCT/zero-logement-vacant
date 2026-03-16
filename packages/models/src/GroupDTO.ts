import { HousingFiltersDTO } from './HousingFiltersDTO';
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
    filters: HousingFiltersDTO;
  };
}

export type GroupPayload = GroupPayloadDTO;
export type GroupAddHousingPayload = GroupPayload['housing'];
export type GroupRemoveHousingPayload = GroupAddHousingPayload;
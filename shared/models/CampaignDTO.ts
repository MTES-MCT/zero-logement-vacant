import { UserDTO } from './UserDTO';
import { HousingFiltersDTO } from './HousingFiltersDTO';

export interface CampaignDTO {
  id: string;
  title: string;
  filters: HousingFiltersDTO;
  createdBy: UserDTO;
  createdAt: Date;
  validatedAt?: Date;
  exportedAt?: Date;
  sentAt?: Date;
  archivedAt?: Date;
  sendingDate?: Date;
  confirmedAt?: Date;
}

export interface CampaignPayloadDTO extends Pick<CampaignDTO, 'title'> {
  housing: {
    all: boolean;
    ids: string[];
    filters: HousingFiltersDTO;
  };
}

import type {
  CampaignDTO,
  EstablishmentDTO,
  GroupDTO,
  HousingDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';

export type EntityMap = {
  campaigns: CampaignDTO;
  establishments: EstablishmentDTO;
  groups: GroupDTO;
  housings: HousingDTO;
  owners: OwnerDTO;
  users: UserDTO;
};

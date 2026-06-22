import type {
  BuildingDTO,
  CampaignDTO,
  EstablishmentDTO,
  GroupDTO,
  HousingDTO,
  OwnerDTO,
  UserDTO
} from '@zerologementvacant/models';

export type EntityMap = {
  buildings: BuildingDTO;
  campaigns: CampaignDTO;
  establishments: EstablishmentDTO;
  groups: GroupDTO;
  housings: HousingDTO;
  owners: OwnerDTO;
  users: UserDTO;
};

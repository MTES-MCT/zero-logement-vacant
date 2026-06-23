import type { BuildingApi } from '~/models/BuildingApi';
import type { CampaignApi } from '~/models/CampaignApi';
import type { EstablishmentApi } from '~/models/EstablishmentApi';
import type { HousingApi } from '~/models/HousingApi';
import type { HousingOwnerApi } from '~/models/HousingOwnerApi';
import type { OwnerApi } from '~/models/OwnerApi';
import type { UserApi } from '~/models/UserApi';

/**
 * Maps each logical entity to its server-side `*Api` shape. This is the
 * API-level counterpart of the DTO `EntityMap` in `@zerologementvacant/factories`.
 */
export type EntityMap = {
  buildings: BuildingApi;
  campaigns: CampaignApi;
  establishments: EstablishmentApi;
  housings: HousingApi;
  housingOwners: HousingOwnerApi;
  owners: OwnerApi;
  users: UserApi;
};

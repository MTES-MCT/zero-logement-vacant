export interface CampaignFiltersApi {
  establishmentId: string;
  groupIds?: string[];
  /**
   * If provided, only return campaigns where ALL housings are within these geoCodes.
   * Campaigns with any housing outside these geoCodes will be excluded.
   */
  geoCodes?: string[];
}

export interface CampaignQuery {
  groups?: string;
  sort?: string[];
}

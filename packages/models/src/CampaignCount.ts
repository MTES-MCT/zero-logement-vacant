export const CAMPAIGN_COUNT_VALUES = ['0', '1', '2', 'gt2'] as const;

export type CampaignCount = (typeof CAMPAIGN_COUNT_VALUES)[number];

export interface Jobs {
  'campaign:generate': {
    campaignId: string;
    establishmentId: string;
  };
}

export const JOBS: Array<keyof Jobs> = ['campaign:generate'];

export interface Jobs {
  'campaign:generate': (payload: {
    campaignId: string;
    establishmentId: string;
  }) => { id: string };
}

export const JOBS: Array<keyof Jobs> = ['campaign:generate'];

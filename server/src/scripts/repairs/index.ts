import { campaignSendingDateRepair } from './campaign-sending-date';
import type { Repair } from './lib/types';

// Register new repairs here — one line per repair:
// import { myRepair } from './my-repair';

export const repairs: Record<string, Repair<any>> = {
  'campaign-sending-date': campaignSendingDateRepair
};

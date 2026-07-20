import { CampaignDocumentDTO } from '@zerologementvacant/models';

import {
  DocumentApi,
  toDocumentDTO,
  type FetchDocumentURLOptions
} from './DocumentApi';

export interface CampaignDocumentApi extends DocumentApi {
  campaignId: string;
}

export async function toCampaignDocumentDTO(
  document: CampaignDocumentApi,
  options: FetchDocumentURLOptions
): Promise<CampaignDocumentDTO> {
  return toDocumentDTO(document, options);
}

import { DraftDTO } from '@zerologementvacant/models';

import {
  toDocumentDTO,
  type DocumentApi,
  type FetchDocumentURLOptions
} from '~/models/DocumentApi';
import { SenderApi, toSenderDTO } from '~/models/SenderApi';

export interface DraftApi extends Omit<DraftDTO, 'sender' | 'logoNext'> {
  establishmentId: string;
  senderId: string;
  sender: SenderApi;
  logoNext: [DocumentApi | null, DocumentApi | null];
}

/**
 * Convert DraftApi to DraftDTO, including nested sender and logos.
 * Fetches pre-signed URLs for logos and sender's signatory documents.
 */
export async function toDraftDTO(
  draft: DraftApi,
  options: FetchDocumentURLOptions
): Promise<DraftDTO> {
  const [logoOne, logoTwo] = await Promise.all([
    draft.logoNext[0] ? await toDocumentDTO(draft.logoNext[0], options) : null,
    draft.logoNext[1] ? await toDocumentDTO(draft.logoNext[1], options) : null
  ]);

  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body,
    logo: draft.logo,
    logoNext: [logoOne, logoTwo],
    sender: await toSenderDTO(draft.sender, options),
    writtenAt: draft.writtenAt,
    writtenFrom: draft.writtenFrom,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt
  };
}

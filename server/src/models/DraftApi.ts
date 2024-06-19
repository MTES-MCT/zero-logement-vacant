import { DraftDTO } from '@zerologementvacant/models';
import { SenderApi, toSenderDTO } from './SenderApi';

export interface DraftApi extends Omit<DraftDTO, 'sender'> {
  establishmentId: string;
  senderId: string;
  sender: SenderApi;
}

export function toDraftDTO(draft: DraftApi): DraftDTO {
  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body,
    logo: draft.logo,
    sender: toSenderDTO(draft.sender),
    writtenAt: draft.writtenAt,
    writtenFrom: draft.writtenFrom,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

import { DraftDTO } from '../../shared/models/DraftDTO';
import { SenderApi, toSenderDTO } from './SenderApi';

export interface DraftApi extends DraftDTO {
  establishmentId: string;
  senderId: string;
  sender: SenderApi;
}

export function toDraftDTO(draft: DraftApi): DraftDTO {
  return {
    id: draft.id,
    body: draft.body,
    logo: draft.logo,
    sender: toSenderDTO(draft.sender),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

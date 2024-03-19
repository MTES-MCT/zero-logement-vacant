import { DraftDTO } from '../../shared/models/DraftDTO';
import { SenderApi, toSenderDTO } from './SenderApi';

export interface DraftApi extends DraftDTO {
  establishmentId: string;
  senderId: string | null;
  sender: SenderApi | null;
}

export function toDraftDTO(draft: DraftApi): DraftDTO {
  return {
    id: draft.id,
    body: draft.body,
    sender: draft.sender ? toSenderDTO(draft.sender) : null,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

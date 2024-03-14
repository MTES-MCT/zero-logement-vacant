import { DraftDTO } from '../../shared/models/DraftDTO';

export interface DraftApi extends DraftDTO {
  establishmentId: string;
}

export function toDraftDTO(draft: DraftApi): DraftDTO {
  return {
    id: draft.id,
    body: draft.body,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

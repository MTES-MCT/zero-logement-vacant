import { SenderDTO } from './SenderDTO';

export interface DraftDTO {
  id: string;
  body: string;
  sender: SenderDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO extends Pick<DraftDTO, 'body'> {
  campaign: string;
}

export type DraftUpdatePayloadDTO = Pick<DraftDTO, 'id' | 'body'>;
export interface DraftPayloadDTO extends Pick<DraftDTO, 'body'> {
  sender: Omit<SenderDTO, 'id' | 'createdAt' | 'updatedAt'>;
}

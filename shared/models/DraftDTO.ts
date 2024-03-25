import { SenderDTO, SenderPayloadDTO } from './SenderDTO';

export interface DraftDTO {
  id: string;
  body: string;
  sender: SenderDTO;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO extends Pick<DraftDTO, 'body'> {
  campaign: string;
  sender: SenderPayloadDTO;
}

export interface DraftUpdatePayloadDTO extends Pick<DraftDTO, 'id' | 'body'> {
  sender: SenderPayloadDTO;
}

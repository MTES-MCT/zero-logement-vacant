import { SenderDTO, SenderPayloadDTO } from './SenderDTO';

export interface DraftDTO {
  id: string;
  body: string;
  sender: SenderDTO;
  writtenAt: string;
  writtenFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO
  extends Pick<DraftDTO, 'body' | 'writtenAt' | 'writtenFrom'> {
  campaign: string;
  sender: SenderPayloadDTO;
}

export interface DraftUpdatePayloadDTO
  extends Pick<DraftDTO, 'id' | 'body' | 'writtenAt' | 'writtenFrom'> {
  sender: SenderPayloadDTO;
}

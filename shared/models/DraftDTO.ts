import { SenderDTO, SenderPayloadDTO } from './SenderDTO';

export interface DraftDTO {
  id: string;
  subject: string;
  body: string;
  sender: SenderDTO;
  writtenAt: string;
  writtenFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO
  extends Pick<DraftDTO, 'subject' | 'body' | 'writtenAt' | 'writtenFrom'> {
  campaign: string;
  sender: SenderPayloadDTO;
}

export interface DraftUpdatePayloadDTO
  extends Pick<
    DraftDTO,
    'id' | 'subject' | 'body' | 'writtenAt' | 'writtenFrom'
  > {
  sender: SenderPayloadDTO;
}

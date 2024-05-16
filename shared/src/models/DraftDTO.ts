import { SenderDTO, SenderPayloadDTO } from './SenderDTO';

export interface DraftDTO {
  id: string;
  subject: string | null;
  body: string | null;
  logo: string[] | null;
  sender: SenderDTO;
  writtenAt: string | null;
  writtenFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO
  extends Pick<
    DraftDTO,
    'subject' | 'body' | 'logo' | 'writtenAt' | 'writtenFrom'
  > {
  campaign: string;
  sender: SenderPayloadDTO | null;
}

export interface DraftUpdatePayloadDTO
  extends Pick<
    DraftDTO,
    'id' | 'subject' | 'body' | 'logo' | 'writtenAt' | 'writtenFrom'
  > {
  sender: SenderPayloadDTO;
}

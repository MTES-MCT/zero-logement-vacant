import { SenderDTO, SenderPayloadDTO } from './SenderDTO';

export interface DraftDTO {
  id: string;
  body: string;
  logo: string[];
  sender: SenderDTO;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO
  extends Pick<DraftDTO, 'body' | 'logo'> {
  campaign: string;
  sender: SenderPayloadDTO;
}

export interface DraftUpdatePayloadDTO
  extends Pick<DraftDTO, 'id' | 'body' | 'logo'> {
  sender: SenderPayloadDTO;
}

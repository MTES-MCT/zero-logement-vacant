import { FileUploadDTO } from './FileUploadDTO';
import { SenderDTO, SenderPayloadDTO } from './SenderDTO';
import { HousingDTO } from './HousingDTO';
import { OwnerDTO } from './OwnerDTO';

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
    'subject' | 'body' | 'writtenAt' | 'writtenFrom'
  > {
  campaign: string;
  sender: SenderPayloadDTO | null;
  logo: FileUploadDTO[]
}

export interface DraftUpdatePayloadDTO
  extends Pick<
    DraftDTO,
    'id' | 'subject' | 'body' | 'writtenAt' | 'writtenFrom'
  > {
  sender: SenderPayloadDTO;
  logo: FileUploadDTO[]
}

export interface DraftPreviewPayloadDTO {
  housing: HousingDTO;
  owner: OwnerDTO;
}

export interface DraftFiltersDTO {
  campaign?: string;
}

import { FileUploadDTO } from './FileUploadDTO';
import { SenderDTO, SenderPayloadDTO } from './SenderDTO';
import { HousingDTO } from './HousingDTO';
import { OwnerDTO } from './OwnerDTO';

export interface DraftDTO {
  id: string;
  subject: string | null;
  body: string | null;
  logo: FileUploadDTO[] | null;
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

export interface DraftPreviewPayloadDTO {
  housing: HousingDTO;
  owner: OwnerDTO;
}

export interface DraftFiltersDTO {
  campaign?: string;
}

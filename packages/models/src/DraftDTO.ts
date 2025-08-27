import type { FileUploadDTO } from './FileUploadDTO';
import type { SenderDTO, SenderPayload } from './SenderDTO';
import type { HousingDTO } from './HousingDTO';
import type { OwnerDTO } from './OwnerDTO';

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

export interface DraftCreationPayload
  extends Pick<
    DraftDTO,
    'subject' | 'body' | 'logo' | 'writtenAt' | 'writtenFrom'
  > {
  campaign: string;
  sender: SenderPayload | null;
}

export interface DraftUpdatePayload
  extends Pick<
    DraftDTO,
    'subject' | 'body' | 'logo' | 'writtenAt' | 'writtenFrom'
  > {
  sender: SenderPayload;
}

export interface DraftPreviewPayload {
  housing: HousingDTO;
  owner: OwnerDTO;
}

export interface DraftFiltersDTO {
  campaign?: string;
}

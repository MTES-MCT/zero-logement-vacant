import type { CampaignDTO } from './CampaignDTO';
import type { DocumentDTO } from './DocumentDTO';
import { FileUploadDTO } from './FileUploadDTO';
import { HousingDTO } from './HousingDTO';
import { OwnerDTO } from './OwnerDTO';
import { SenderDTO, SenderPayloadDTO, type SenderPayload } from './SenderDTO';

export interface DraftDTO {
  id: string;
  subject: string | null;
  body: string | null;
  /**
   * @deprecated Use {@link logoNext} instead.
   */
  logo: FileUploadDTO[] | null;
  logoNext: [DocumentDTO | null, DocumentDTO | null];
  sender: SenderDTO;
  writtenAt: string | null;
  writtenFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * @deprecated Use {@link DraftCreationPayload} instead.
 */
export interface DraftCreationPayloadDTO
  extends Pick<
    DraftDTO,
    'subject' | 'body' | 'logo' | 'writtenAt' | 'writtenFrom'
  > {
  campaign: string;
  sender: SenderPayloadDTO | null;
}

export type DraftCreationPayload = Pick<
  DraftDTO,
  'subject' | 'body' | 'writtenAt' | 'writtenFrom'
> & {
  campaign: CampaignDTO['id'];
  logo: [DocumentDTO['id'] | null, DocumentDTO['id'] | null];
  sender: SenderPayload | null;
};

/**
 * @deprecated Use {@link DraftUpdatePayload} instead.
 */
export interface DraftUpdatePayloadDTO
  extends Pick<
    DraftDTO,
    'id' | 'subject' | 'body' | 'logo' | 'writtenAt' | 'writtenFrom'
  > {
  sender: SenderPayloadDTO;
}

export type DraftUpdatePayload = Omit<DraftCreationPayload, 'campaign'> &
  Pick<DraftDTO, 'id'>;

export interface DraftPreviewPayloadDTO {
  housing: HousingDTO;
  owner: OwnerDTO;
}

export interface DraftFiltersDTO {
  campaign?: string;
}

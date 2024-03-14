export interface DraftDTO {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftCreationPayloadDTO extends Pick<DraftDTO, 'body'> {
  campaign: string;
}

export type DraftUpdatePayloadDTO = Pick<DraftDTO, 'body'>;

export interface DraftDTO {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftPayloadDTO extends Pick<DraftDTO, 'body'> {
  campaign: string;
}

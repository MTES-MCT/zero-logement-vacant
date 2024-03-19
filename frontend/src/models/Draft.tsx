import { DraftDTO, DraftPayloadDTO } from '../../../shared/models/DraftDTO';
import { Sender, SenderPayload } from './Sender';

export interface Draft extends DraftDTO {}

export interface DraftPayload extends DraftPayloadDTO {
  id: string;
  sender: SenderPayload;
}

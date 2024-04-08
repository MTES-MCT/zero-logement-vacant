import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
} from '../../../shared/models/DraftDTO';
import { SenderPayload } from './Sender';

export interface Draft extends DraftDTO {}

export interface DraftCreationPayload extends DraftCreationPayloadDTO {
  sender: SenderPayload;
}

export type DraftUpdatePayload = DraftUpdatePayloadDTO;

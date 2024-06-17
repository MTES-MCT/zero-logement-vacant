import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayloadDTO,
} from '@zerologementvacant/models';
import { SenderPayload } from './Sender';
import { DeepNonNullable } from 'ts-essentials';

export interface Draft extends DraftDTO {}

export interface DraftCreationPayload
  extends DeepNonNullable<DraftCreationPayloadDTO> {
  sender: DeepNonNullable<SenderPayload>;
}

export type DraftUpdatePayload = DeepNonNullable<DraftUpdatePayloadDTO>;

export type DraftPreviewPayload = DraftPreviewPayloadDTO;

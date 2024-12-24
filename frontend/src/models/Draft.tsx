import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayloadDTO
} from '@zerologementvacant/models';
import { SenderPayload } from './Sender';
import { DeepNonNullable } from 'ts-essentials';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Draft extends DraftDTO {}

export interface DraftCreationPayload
  extends DeepNonNullable<Omit<DraftCreationPayloadDTO, 'sender'>> {
  sender: SenderPayload;
}

export type DraftUpdatePayload = DeepNonNullable<
  Omit<DraftUpdatePayloadDTO, 'sender'>
> & {
  sender: SenderPayload;
};

export type DraftPreviewPayload = DraftPreviewPayloadDTO;

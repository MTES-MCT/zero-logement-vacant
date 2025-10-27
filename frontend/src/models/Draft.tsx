import type {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayloadDTO
} from '@zerologementvacant/models';
import type { DeepNonNullable } from 'ts-essentials';

import type { SenderPayload } from './Sender';

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

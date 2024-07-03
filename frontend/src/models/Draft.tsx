import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayloadDTO
} from '@zerologementvacant/models';
import { SenderPayload } from './Sender';
import { DeepNonNullable } from 'ts-essentials';

export interface Draft extends DraftDTO {}

export interface DraftCreationPayload
  extends DeepNonNullable<Omit<DraftCreationPayloadDTO, 'logo' | 'sender'>>,
    Pick<DraftCreationPayloadDTO, 'logo'> {
  sender: DeepNonNullable<Omit<SenderPayload, 'signatoryFile'>> &
    Pick<SenderPayload, 'signatoryFile'>;
}

export type DraftUpdatePayload = DeepNonNullable<DraftUpdatePayloadDTO>;

export type DraftPreviewPayload = DraftPreviewPayloadDTO;

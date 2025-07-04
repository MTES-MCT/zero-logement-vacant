import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftPreviewPayloadDTO,
  DraftUpdatePayloadDTO
} from '@zerologementvacant/models';
import { Equivalence } from 'effect';
import { DeepNonNullable } from 'ts-essentials';

import { SenderPayload } from './Sender';

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

export const draftEquivalence: Equivalence.Equivalence<DraftCreationPayload> =
  Equivalence.struct<DraftCreationPayload>({
    subject: Equivalence.string
  });

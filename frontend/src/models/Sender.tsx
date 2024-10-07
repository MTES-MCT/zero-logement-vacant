import { SenderDTO, SenderPayloadDTO } from '@zerologementvacant/models';
import { DeepNonNullable } from 'ts-essentials';

export type Sender = SenderDTO;

export type SenderPayload = DeepNonNullable<
  Omit<SenderPayloadDTO, 'signatoryFile'>
> &
  Pick<SenderPayloadDTO, 'signatoryFile'>;

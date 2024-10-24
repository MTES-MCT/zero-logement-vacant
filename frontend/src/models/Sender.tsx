import {
  SenderDTO,
  SenderPayloadDTO,
  SignatoryDTO
} from '@zerologementvacant/models';
import { DeepNonNullable } from 'ts-essentials';

export type Sender = SenderDTO;

export type SenderPayload = DeepNonNullable<
  Omit<SenderPayloadDTO, 'signatories'>
> &
  Pick<SenderPayloadDTO, 'signatories'>;

export type SignatoryPayload = SignatoryDTO;
export type SignatoriesPayload = [
  SignatoryPayload | null,
  SignatoryPayload | null
];

import {
  SenderDTO,
  SenderPayloadDTO,
  SignatoryDTO
} from '@zerologementvacant/models';
import { DeepNonNullable } from 'ts-essentials';

export type Sender = SenderDTO;

export type SenderPayload = DeepNonNullable<
  Omit<SenderPayloadDTO, 'signatoryFile' | 'signatories'>
> &
  Pick<SenderPayloadDTO, 'signatoryFile' | 'signatories'>;

export type SignatoryPayload = SignatoryDTO;
export type SignatoriesPayload = [
  SignatoryPayload | null,
  SignatoryPayload | null
];

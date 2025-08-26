import {
  SenderDTO,
  SenderPayloadDTO,
  SignatoryDTO
} from '@zerologementvacant/models';

export type Sender = SenderDTO;
export type SenderPayload = SenderPayloadDTO;
export type SignatoryPayload = SignatoryDTO;
export type SignatoriesPayload = [
  SignatoryPayload | null,
  SignatoryPayload | null
];

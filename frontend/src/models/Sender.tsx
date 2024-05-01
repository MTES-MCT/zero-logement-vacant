import { DeepNonNullable } from 'ts-essentials';

import { SenderDTO, SenderPayloadDTO } from '../../../shared';

export type Sender = SenderDTO;

export type SenderPayload = DeepNonNullable<SenderPayloadDTO>;

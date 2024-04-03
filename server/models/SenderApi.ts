import { SenderDTO, SenderPayloadDTO } from '../../shared/models/SenderDTO';
import { v4 as uuidv4 } from 'uuid';

export interface SenderApi extends SenderDTO {
  establishmentId: string;
}

export function toSenderDTO(sender: SenderApi): SenderDTO {
  return {
    id: sender.id,
    name: sender.name,
    service: sender.service,
    firstName: sender.firstName,
    lastName: sender.lastName,
    address: sender.address,
    email: sender.email,
    phone: sender.phone,
    signatoryLastName: sender.signatoryLastName,
    signatoryFirstName: sender.signatoryFirstName,
    signatoryRole: sender.signatoryRole,
    signatoryFile: sender.signatoryFile,
    createdAt: sender.createdAt,
    updatedAt: sender.updatedAt,
  };
}

export function createOrReplaceSender(
  payload: SenderPayloadDTO,
  existing: SenderApi | null,
  establishmentId: string
): SenderApi {
  return {
    id: existing?.id ?? uuidv4(),
    name: payload.name,
    service: payload.service,
    firstName: payload.firstName,
    lastName: payload.lastName,
    address: payload.address,
    email: payload.email,
    phone: payload.phone,
    signatoryLastName: payload.signatoryLastName,
    signatoryFirstName: payload.signatoryFirstName,
    signatoryRole: payload.signatoryRole,
    signatoryFile: payload.signatoryFile,
    createdAt: existing?.createdAt ?? new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    establishmentId,
  };
}

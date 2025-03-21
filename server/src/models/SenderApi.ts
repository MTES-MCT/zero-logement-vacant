import { SenderDTO } from '@zerologementvacant/models';

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
    signatories: sender.signatories,
    createdAt: sender.createdAt,
    updatedAt: sender.updatedAt
  };
}

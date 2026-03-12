import { SenderDTO, type SignatoryDTO } from '@zerologementvacant/models';

import {
  fromDocumentDTO,
  toDocumentDTO,
  type DocumentApi,
  type FetchDocumentURLOptions
} from '~/models/DocumentApi';

export type SenderApi = Omit<SenderDTO, 'signatories'> & {
  establishmentId: string;
  signatories: [SignatoryApi | null, SignatoryApi | null];
};

export type SignatoryApi = Omit<SignatoryDTO, 'document'> & {
  document: DocumentApi | null;
};

export async function toSenderDTO(
  sender: SenderApi,
  options: FetchDocumentURLOptions
): Promise<SenderDTO> {
  const [signatoryOne, signatoryTwo] = await Promise.all([
    sender.signatories[0]
      ? toSignatoryDTO(sender.signatories[0], options)
      : Promise.resolve(null),
    sender.signatories[1]
      ? toSignatoryDTO(sender.signatories[1], options)
      : Promise.resolve(null)
  ]);

  return {
    id: sender.id,
    name: sender.name,
    service: sender.service,
    firstName: sender.firstName,
    lastName: sender.lastName,
    address: sender.address,
    email: sender.email,
    phone: sender.phone,
    signatories: [signatoryOne, signatoryTwo],
    createdAt: sender.createdAt,
    updatedAt: sender.updatedAt
  };
}

export async function toSignatoryDTO(
  signatory: SignatoryApi,
  options: FetchDocumentURLOptions
): Promise<SignatoryDTO> {
  return {
    firstName: signatory.firstName,
    lastName: signatory.lastName,
    role: signatory.role,
    file: signatory.file,
    document:
      signatory.document !== null
        ? await toDocumentDTO(signatory.document, options)
        : null
  };
}

/**
 * @deprecated Exists only to facilitate migration from `draftController.create` to `draftController.createNext`
 * and `draftController.update` to `draftController.updateNext`. Should be removed once the migration is complete.
 */
export function fromSignatoryDTO(signatory: SignatoryDTO): SignatoryApi {
  return {
    firstName: signatory.firstName,
    lastName: signatory.lastName,
    role: signatory.role,
    file: signatory.file,
    document: signatory.document ? fromDocumentDTO(signatory.document) : null
  };
}

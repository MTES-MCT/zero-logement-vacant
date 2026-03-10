import { pipe, Predicate, Record } from 'effect';

import { FileUploadDTO } from './FileUploadDTO';
import type { DocumentDTO } from './DocumentDTO';

export interface SenderDTO {
  id: string;
  name: string | null;
  service: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  signatories: SignatoriesDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatoryDTO {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  /**
   * @deprecated Use {@link document} instead.
   */
  file: FileUploadDTO | null;
  document: DocumentDTO | null;
}
export type SignatoriesDTO = [SignatoryDTO | null, SignatoryDTO | null];

export function isEmpty(signatory: SignatoryDTO): boolean {
  return pipe(signatory, Record.every(Predicate.isNull));
}

/**
 * @deprecated Use {@link SenderPayload} instead.
 */
export type SenderPayloadDTO = Pick<
  SenderDTO,
  | 'name'
  | 'service'
  | 'firstName'
  | 'lastName'
  | 'address'
  | 'email'
  | 'phone'
  | 'signatories'
>;

export type SenderPayload = Pick<
  SenderDTO,
  'name' | 'service' | 'firstName' | 'lastName' | 'address' | 'email' | 'phone'
> & {
  signatories: [SignatoryPayload | null, SignatoryPayload | null];
};

export type SignatoryPayload = Pick<
  SignatoryDTO,
  'firstName' | 'lastName' | 'role'
> & {
  /**
   * The document to link to this signatory.
   * The document will be linked only if it exists.
   */
  document: DocumentDTO['id'] | null;
};

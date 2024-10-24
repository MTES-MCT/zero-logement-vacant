import { FileUploadDTO } from './FileUploadDTO';

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
  file: FileUploadDTO | null;
}
export type SignatoriesDTO = [SignatoryDTO | null, SignatoryDTO | null];

export function isEmpty(signatory: SignatoryDTO): boolean {
  return (
    signatory.firstName === null &&
    signatory.lastName === null &&
    signatory.role === null &&
    signatory.file === null
  );
}

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

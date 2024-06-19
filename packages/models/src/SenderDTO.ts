import { FileUploadDTO } from "./FileUploadDTO";

export interface SenderDTO {
  id: string;
  name: string | null;
  service: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  signatoryLastName: string | null;
  signatoryFirstName: string | null;
  signatoryRole: string | null;
  signatoryFile: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SenderPayloadDTO = Omit<Pick<
  SenderDTO,
  | 'name'
  | 'service'
  | 'firstName'
  | 'lastName'
  | 'address'
  | 'email'
  | 'phone'
  | 'signatoryLastName'
  | 'signatoryFirstName'
  | 'signatoryRole'
  | 'signatoryFile'
>, 'signatoryFile'> & { signatoryFile: FileUploadDTO | null };

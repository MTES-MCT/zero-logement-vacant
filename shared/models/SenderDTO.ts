export interface SenderDTO {
  id: string;
  name: string;
  service: string;
  firstName: string;
  lastName: string;
  address: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SenderPayloadDTO = Pick<
  SenderDTO,
  'name' | 'service' | 'firstName' | 'lastName' | 'address' | 'email' | 'phone'
>;

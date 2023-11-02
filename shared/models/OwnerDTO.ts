export interface OwnerPayloadDTO {
  rawAddress: string[];
  fullName: string;
  birthDate?: string;
  email?: string;
  phone?: string;
}

export interface OwnerDTO extends Omit<OwnerPayloadDTO, 'birthDate'> {
  id: string;
  administrator?: string;
  birthDate?: Date;
  kind?: string;
  kindDetail?: string;
}

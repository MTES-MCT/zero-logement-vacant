export interface OwnerPayloadDTO {
  rawAddress: string[];
  fullName: string;
  /**
   * A date formatted like YYYY-MM-DD
   */
  birthDate?: string;
  email?: string;
  phone?: string;
  banAddress?: {
    houseNumber?: string;
    postalCode: string;
    street?: string;
    city: string;
    score?: number;
  };
  additionalAddress?: string;
}

export interface OwnerDTO extends Omit<OwnerPayloadDTO, 'birthDate'> {
  id: string;
  administrator?: string;
  birthDate?: Date;
  kind?: string;
  kindDetail?: string;
}

export interface PartialOwnerProspect {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
}

export interface OwnerProspect extends PartialOwnerProspect {
  address?: string;
  geoCode: string;
}

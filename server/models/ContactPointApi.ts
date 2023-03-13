import { ContactPoint } from '../../shared/models/ContactPoint';

export interface ContactPointApi {
  id: string;
  establishmentId: string;
  title: string;
  opening?: string;
  address?: string;
  geoCodes: string[];
  email?: string;
  phone?: string;
  notes?: string;
}

export function toContactPointDTO(contactPoint: ContactPointApi): ContactPoint {
  return {
    id: contactPoint.id,
    title: contactPoint.title,
    opening: contactPoint.opening,
    address: contactPoint.address,
    geoCodes: contactPoint.geoCodes,
    email: contactPoint.email,
    phone: contactPoint.phone,
    notes: contactPoint.notes,
  };
}

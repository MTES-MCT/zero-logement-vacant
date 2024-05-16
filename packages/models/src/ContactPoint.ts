export interface DraftContactPoint {
  establishmentId: string;
  title: string;
  opening?: string;
  address?: string;
  geoCodes: string[];
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ContactPoint extends DraftContactPoint {
  id: string;
}

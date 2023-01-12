export interface DraftContactPoint {
  title: string;
  opening?: string;
  address?: string;
  geoCode?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ContactPoint extends DraftContactPoint {
  id: string;
}

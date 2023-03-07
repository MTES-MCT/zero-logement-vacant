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

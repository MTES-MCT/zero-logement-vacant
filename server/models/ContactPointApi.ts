export interface DraftContactPointApi {
  establishmentId: string;
  title: string;
  opening?: string;
  address?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ContactPointApi extends DraftContactPointApi {
  id: string;
}

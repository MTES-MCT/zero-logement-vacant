export interface DraftContactPointApi {
  establishmentId: string;
  title: string;
  opening?: string;
  address?: string;
  geoCode?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ContactPointApi extends DraftContactPointApi {
  id: string;
}

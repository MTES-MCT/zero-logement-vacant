import db from './db';

export const establishmentsLocalitiesTable = 'establishments_localities';
export const EstablishmentLocalities = (transaction = db) =>
  transaction<EstablishmentLocalityDBO>(establishmentsLocalitiesTable);

export interface EstablishmentLocalityDBO {
  establishment_id: string;
  locality_id: string;
}

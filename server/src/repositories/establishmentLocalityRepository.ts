import db from '~/infra/database';
import { EstablishmentDBO } from './establishmentRepository';
import { Localities } from './localityRepository';
import { logger } from '~/infra/logger';

export const establishmentsLocalitiesTable = 'establishments_localities';
export const EstablishmentLocalities = (transaction = db) =>
  transaction<EstablishmentLocalityDBO>(establishmentsLocalitiesTable);

export interface EstablishmentLocalityDBO {
  establishment_id: string;
  locality_id: string;
}

async function updateLocalities(establishment: EstablishmentDBO): Promise<void> {
  const subquery = await Localities()
  .join('establishments', 'localities.geo_code', db.raw('ANY(establishments.localities_geo_code)'))
  .where('establishments.id', establishment.id)
  .select('localities.id as locality_id', 'establishments.id as establishment_id');

  await EstablishmentLocalities()
  .insert(subquery)
  .onConflict()
  .ignore()
  .then(() => {
    logger.info('Insert successful');
  })
  .catch(err => {
    logger.error('Error during insert', err);
  });
}

export default {
  updateLocalities,
};

import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { UserPerimeterApi } from '~/models/UserPerimeterApi';

export const userPerimeterTable = 'user_perimeters';
export const UserPerimeters = (transaction = db) =>
  transaction<UserPerimeterDBO>(userPerimeterTable);

async function upsert(perimeter: UserPerimeterApi): Promise<void> {
  logger.debug('Upsert user perimeter', { userId: perimeter.userId });

  const dbo = formatUserPerimeterApi(perimeter);

  await UserPerimeters()
    .insert(dbo)
    .onConflict('user_id')
    .merge({
      geo_codes: dbo.geo_codes,
      departments: dbo.departments,
      regions: dbo.regions,
      epci: dbo.epci,
      fr_entiere: dbo.fr_entiere,
      updated_at: dbo.updated_at
    });
}

async function get(userId: string): Promise<UserPerimeterApi | null> {
  logger.debug('Get user perimeter', { userId });

  const perimeter = await UserPerimeters()
    .select()
    .where('user_id', userId)
    .first();

  return perimeter ? parseUserPerimeterApi(perimeter) : null;
}

async function remove(userId: string): Promise<void> {
  logger.debug('Remove user perimeter', { userId });
  await UserPerimeters().where('user_id', userId).delete();
}

export interface UserPerimeterDBO {
  user_id: string;
  geo_codes: string[];
  departments: string[];
  regions: string[];
  epci: string[];
  fr_entiere: boolean;
  updated_at: Date | string;
}

export const parseUserPerimeterApi = (
  dbo: UserPerimeterDBO
): UserPerimeterApi => ({
  userId: dbo.user_id,
  geoCodes: dbo.geo_codes || [],
  departments: dbo.departments || [],
  regions: dbo.regions || [],
  epci: dbo.epci || [],
  frEntiere: dbo.fr_entiere,
  updatedAt: new Date(dbo.updated_at).toJSON()
});

export const formatUserPerimeterApi = (
  api: UserPerimeterApi
): UserPerimeterDBO => ({
  user_id: api.userId,
  geo_codes: api.geoCodes,
  departments: api.departments,
  regions: api.regions,
  epci: api.epci,
  fr_entiere: api.frEntiere,
  updated_at: new Date(api.updatedAt).toJSON()
});

export default {
  upsert,
  get,
  remove
};

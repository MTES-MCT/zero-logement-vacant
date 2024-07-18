import db from '~/infra/database';
import { ContactPointApi } from '~/models/ContactPointApi';
import { settingsTable } from './settingsRepository';
import { logger } from '~/infra/logger';

type ContactPointsUniqueProperties = Pick<
  ContactPointApi,
  'id' | 'establishmentId'
>;

export const contactPointsTable = 'contact_points';
export const ContactPoints = (transaction = db) =>
  transaction<ContactPointDBO>(contactPointsTable);

async function get(contactPointId: string): Promise<ContactPointApi | null> {
  logger.info('Get ContactPointApi with id', contactPointId);
  const contactPoint = await ContactPoints()
    .where('id', contactPointId)
    .first();
  return contactPoint ? parseContactPointApi(contactPoint) : null;
}

async function insert(contactPointApi: ContactPointApi): Promise<void> {
  logger.info('Insert ContactPointApi');
  await ContactPoints().insert(formatContactPointApi(contactPointApi));
}

async function update(contactPointApi: ContactPointApi): Promise<void> {
  logger.info('Update contactPointApi with id', contactPointApi.id);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, establishment_id, ...updatedData } =
    formatContactPointApi(contactPointApi);
  await ContactPoints().where({ id: contactPointApi.id, }).update(updatedData);
}

async function find(
  establishmentId: string,
  publicOnly?: boolean
): Promise<ContactPointApi[]> {
  logger.info(
    'List contactPointApi for establishment with id',
    establishmentId
  );
  const contactPoints = await ContactPoints()
    .select(`${contactPointsTable}.*`)
    .where(`${contactPointsTable}.establishment_id`, establishmentId)
    .modify((builder) => {
      if (publicOnly) {
        builder
          .join(
            settingsTable,
            `${settingsTable}.establishment_id`,
            `${contactPointsTable}.establishment_id`
          )
          .andWhere('contact_points_public', true);
      }
    })
    .orderBy('title');
  return contactPoints.map(parseContactPointApi);
}

async function findOne(
  options: ContactPointsUniqueProperties
): Promise<ContactPointApi | null> {
  logger.info('Find contactPointApi with options', options);
  const contactPoint = await ContactPoints()
    .where({
      id: options.id,
      establishment_id: options.establishmentId,
    })
    .orderBy('title')
    .first();
  return contactPoint ? parseContactPointApi(contactPoint) : null;
}

async function remove(id: string): Promise<void> {
  logger.info('Delete contactPointApi with id', id);
  await ContactPoints().where({ id, }).delete();
}

interface ContactPointDBO {
  id: string;
  establishment_id: string;
  title: string;
  opening?: string;
  address?: string;
  geo_codes: string[];
  email?: string;
  phone?: string;
  notes?: string;
}

export const formatContactPointApi = (
  contactPointApi: ContactPointApi
): ContactPointDBO => ({
  id: contactPointApi.id,
  establishment_id: contactPointApi.establishmentId,
  title: contactPointApi.title,
  opening: contactPointApi.opening,
  address: contactPointApi.address,
  geo_codes: contactPointApi.geoCodes,
  email: contactPointApi.email,
  phone: contactPointApi.phone,
  notes: contactPointApi.notes,
});

export const parseContactPointApi = (
  contactPointDbo: ContactPointDBO
): ContactPointApi => ({
  id: contactPointDbo.id,
  establishmentId: contactPointDbo.establishment_id,
  title: contactPointDbo.title,
  opening: contactPointDbo.opening,
  address: contactPointDbo.address,
  geoCodes: contactPointDbo.geo_codes,
  email: contactPointDbo.email,
  phone: contactPointDbo.phone,
  notes: contactPointDbo.notes,
});

export default {
  find,
  findOne,
  get,
  insert,
  update,
  remove,
};

import db from './db';
import {
  ContactPointApi,
  DraftContactPointApi,
} from '../models/ContactPointApi';

export const contactPointsTable = 'contact_points';

const get = async (contactPointId: string): Promise<ContactPointApi | null> => {
  console.log('Get ContactPointApi with id', contactPointId);
  const contactPoint = await db(contactPointsTable)
    .where('id', contactPointId)
    .first();
  return contactPoint ? parseContactPointApi(contactPoint) : null;
};

const insert = async (
  draftContactPointApi: DraftContactPointApi
): Promise<ContactPointApi> => {
  console.log('Insert draftContactPointApi');
  return db(contactPointsTable)
    .insert(formatDraftContactPointApi(draftContactPointApi))
    .returning('*')
    .then((_) => parseContactPointApi(_[0]));
};

const update = async (
  contactPointApi: ContactPointApi
): Promise<ContactPointApi> => {
  console.log('Update contactPointApi with id', contactPointApi.id);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, establishment_id, ...updatedData } =
    formatContactPointApi(contactPointApi);
  return db(contactPointsTable)
    .where('id', contactPointApi.id)
    .update(updatedData)
    .returning('*')
    .then((_) => parseContactPointApi(_[0]));
};

const listContactPoints = async (
  establishmentId: string
): Promise<ContactPointApi[]> => {
  console.log(
    'List contactPointApi for establishment with id',
    establishmentId
  );
  return db(contactPointsTable)
    .where('establishment_id', establishmentId)
    .orderBy('title')
    .then((_) => _.map((_) => parseContactPointApi(_)));
};

const deleteContactPoint = async (contactPointId: string): Promise<number> => {
  console.log('Delete contactPointApi with id', contactPointId);
  return db(contactPointsTable).where('id', contactPointId).delete();
};

interface DraftContactPointDbo {
  establishment_id: string;
  title: string;
  opening?: string;
  address?: string;
  geo_codes: string[];
  email?: string;
  phone?: string;
  notes?: string;
}

interface ContactPointDbo extends DraftContactPointDbo {
  id: string;
}

const formatDraftContactPointApi = (
  draftContactPointApi: DraftContactPointApi
) =>
  <DraftContactPointDbo>{
    establishment_id: draftContactPointApi.establishmentId,
    title: draftContactPointApi.title,
    opening: draftContactPointApi.opening,
    address: draftContactPointApi.address,
    geo_codes: draftContactPointApi.geoCodes,
    email: draftContactPointApi.email,
    phone: draftContactPointApi.phone,
    notes: draftContactPointApi.notes,
  };

const formatContactPointApi = (contactPointApi: ContactPointApi) => {
  const { id, ...draftContactPointApi } = contactPointApi;
  return <ContactPointDbo>{
    id,
    ...formatDraftContactPointApi(draftContactPointApi),
  };
};

const parseContactPointApi = (contactPointDbo: ContactPointDbo) =>
  <ContactPointApi>{
    id: contactPointDbo.id,
    establishmentId: contactPointDbo.establishment_id,
    title: contactPointDbo.title,
    opening: contactPointDbo.opening,
    address: contactPointDbo.address,
    geoCodes: contactPointDbo.geo_codes,
    email: contactPointDbo.email,
    phone: contactPointDbo.phone,
    notes: contactPointDbo.notes,
  };

export default {
  get,
  insert,
  update,
  listContactPoints,
  deleteContactPoint,
  formatContactPointApi,
};

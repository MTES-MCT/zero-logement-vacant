import db from './db';
import { OwnerProspectApi } from '../models/OwnerProspectApi';

export const ownerProspectsTable = 'owner_prospects';

const insert = async (
  ownerProspectApi: OwnerProspectApi
): Promise<OwnerProspectApi> => {
  console.log('Insert ownerProspect with email', ownerProspectApi.email);

  return db(ownerProspectsTable)
    .insert(formatOwnerProspectApi(ownerProspectApi))
    .returning('*')
    .then((_) => parseOwnerProspectApi(_[0]));
};

interface OwnerProspectDbo {
  email: string;
  first_name: string;
  last_name: string;
  address: string;
  geo_code: string;
  phone: string;
  notes?: string;
}

const parseOwnerProspectApi = (
  ownerProspectDbo: OwnerProspectDbo
): OwnerProspectApi => ({
  email: ownerProspectDbo.email,
  firstName: ownerProspectDbo.first_name,
  lastName: ownerProspectDbo.last_name,
  address: ownerProspectDbo.address,
  geoCode: ownerProspectDbo.geo_code,
  phone: ownerProspectDbo.phone,
  notes: ownerProspectDbo.notes,
});

const formatOwnerProspectApi = (
  ownerProspectApi: OwnerProspectApi
): OwnerProspectDbo => ({
  email: ownerProspectApi.email,
  first_name: ownerProspectApi.firstName,
  last_name: ownerProspectApi.lastName,
  address: ownerProspectApi.address,
  geo_code: ownerProspectApi.geoCode,
  phone: ownerProspectApi.phone,
  notes: ownerProspectApi.notes,
});

export default {
  insert,
};

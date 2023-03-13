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
  address: string;
  invariant?: string;
  geo_code: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notes?: string;
}

const parseOwnerProspectApi = (
  ownerProspectDbo: OwnerProspectDbo
): OwnerProspectApi => ({
  address: ownerProspectDbo.address,
  invariant: ownerProspectDbo.invariant,
  geoCode: ownerProspectDbo.geo_code,
  email: ownerProspectDbo.email,
  firstName: ownerProspectDbo.first_name,
  lastName: ownerProspectDbo.last_name,
  phone: ownerProspectDbo.phone,
  notes: ownerProspectDbo.notes,
});

const formatOwnerProspectApi = (
  ownerProspectApi: OwnerProspectApi
): OwnerProspectDbo => ({
  address: ownerProspectApi.address,
  invariant: ownerProspectApi.invariant,
  geo_code: ownerProspectApi.geoCode,
  email: ownerProspectApi.email,
  first_name: ownerProspectApi.firstName,
  last_name: ownerProspectApi.lastName,
  phone: ownerProspectApi.phone,
  notes: ownerProspectApi.notes,
});

export default {
  insert,
};

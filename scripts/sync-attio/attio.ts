import fetch from '@adobe/node-fetch-retry';

import config from '../../server/utils/config';
import { EstablishmentApi } from '../../server/models/EstablishmentApi';
import { UserApi } from '../../server/models/UserApi';
import { AttioOption, toOption } from './attio-option';
import { Option } from './option';
import { AttioCompany } from './attio-company';

const host = 'https://api.attio.com/v2';
const token = config.attio.token;

/**
 * Set up the cache
 */
async function initialize(): Promise<void> {
  await Promise.all([
    listOptions('priorite'),
    listOptions('type_etablissement'),
  ]);
}

async function listOptions(attribute: string): Promise<Option[]> {
  if (cache.has(attribute)) {
    return cache.get(attribute) ?? [];
  }

  console.log(`Listing options for attribute ${attribute}`);
  const response = await fetch(
    `${host}/objects/companies/attributes/${attribute}/options`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error: Error = await response.json();
    throw error;
  }
  const json: { data: AttioOption[] } = await response.json();
  const options = json.data.map(toOption);
  cache.set(attribute, options);
  return options;
}

const cache: Map<string, Option[]> = new Map();

async function getOption(
  attribute: string,
  value: string
): Promise<Option | null> {
  const options = await listOptions(attribute);
  return (
    options
      .filter((option) => !option.is_archived)
      .find((option) => option.title === value) ?? null
  );
}

async function syncEstablishment(
  establishment: EstablishmentApi
): Promise<EstablishmentApi> {
  const kind = await getOption('type_etablissement', establishment.kind);
  const priority = await getOption(
    'priorite',
    establishment.priority ?? 'standard'
  );

  const response = await fetch(
    `${host}/objects/companies/records?matching_attribute=siren`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          values: {
            id: [{ value: establishment.id }],
            name: [{ value: establishment.name }],
            type_etablissement: [{ option: kind?.id }],
            siren: [{ value: establishment.siren }],
            disponible: [{ value: establishment.available }],
            intentions_de_1ere_campagne: [
              { value: establishment.campaignIntent ?? '' },
            ],
            priorite: [{ option: priority?.id }],
          },
        },
      }),
    }
  );
  if (!response.ok) {
    console.error('Bad response', establishment, response.status);
    const error: Error = await response.json();
    console.error(error);
    throw error;
  }
  console.log(`Synced ${establishment.name}`);
  return establishment;
}

async function findCompany(id: string): Promise<AttioCompany | null> {
  const response = await fetch(`${host}/objects/companies/records/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 1,
      filter: { id },
    }),
  });

  if (!response.ok) {
    const error: Error = await response.json();
    throw error;
  }

  const { data } = await response.json();
  const company = data[0];
  return company ? { id: company.id.record_id } : null;
}

async function syncUser(user: UserApi): Promise<UserApi> {
  if (!user.establishmentId) {
    throw new Error(`User ${user.email} has no establishmentId.`);
  }

  const company = await findCompany(user.establishmentId);
  if (!company) {
    throw new Error(`Attio company ${user.establishmentId} not found.`);
  }

  const response = await fetch(
    `${host}/objects/people/records?matching_attribute=email_addresses`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          values: {
            utilisateur_id: [{ value: user.id }],
            email_addresses: [{ email_address: user.email }],
            company: [
              {
                target_object: 'companies',
                target_record_id: company.id,
              },
            ],
            date_activation_zlv: [{ value: user.activatedAt }],
          },
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      const error: Error = await response.json();
      throw error;
    }
    throw new Error(`Error while syncing user ${user.email}`);
  }
  console.log(`Synced ${user.email}`);
  return user;
}

const attio = {
  initialize,
  syncEstablishment,
  syncUser,
};

export default attio;

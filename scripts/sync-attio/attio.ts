import fetch from 'node-fetch';
import config from '../../server/utils/config';
import { EstablishmentApi } from '../../server/models/EstablishmentApi';
import { UserApi } from '../../server/models/UserApi';
import { AttioOption, toOption } from './attio-option';
import { Option } from './option';
import { AttioCompany } from './attio-company';

const host = 'https://api.attio.com/v2';
const token = config.attio.token;

async function listOptions(attribute: string): Promise<Option[]> {
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
  return json.data.map(toOption);
}

const cache: Map<string, Option[]> = new Map();

async function getOption(
  attribute: string,
  value: string
): Promise<Option | null> {
  const options = cache.get(attribute) ?? (await listOptions(attribute));
  cache.set(attribute, options);
  return (
    options
      .filter((option) => !option.is_archived)
      .find((option) => option.title === value) ?? null
  );
}

async function syncEstablishment(
  establishment: EstablishmentApi
): Promise<void> {
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
    const error: Error = await response.json();
    throw error;
  }
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
      filters: { id },
    }),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error: Error = await response.json();
    throw error;
  }

  const company = await response.json();
  return {
    id: company.data[0].id.record_id,
  };
}

async function syncUser(user: UserApi): Promise<void> {
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
    const error: Error = await response.json();
    throw error;
  }
}

const attio = {
  syncEstablishment,
  syncUser,
};

export default attio;

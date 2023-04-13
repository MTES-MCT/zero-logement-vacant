import fetch from 'node-fetch';
import config from '../../server/utils/config';
import { EstablishmentApi } from '../../server/models/EstablishmentApi';

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
    throw new Error(error.message);
  }
  const json: { data: AttioOption[] } = await response.json();
  return json.data.map(toOption);
}

interface AttioOption {
  id: {
    workspace_id: string;
    object_id: string;
    attribute_id: string;
    option_id: string;
  };
  title: string;
  is_archived: boolean;
}

function toOption(option: AttioOption): Option {
  return {
    id: option.id.option_id,
    title: option.title,
    is_archived: option.is_archived,
  };
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

interface Option {
  id: string;
  title: string;
  is_archived: boolean;
}

async function sync(establishment: EstablishmentApi): Promise<void> {
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
    throw new Error(error.message);
  }
}

const attio = {
  sync,
};

export default attio;

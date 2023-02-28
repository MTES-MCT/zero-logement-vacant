import config from '../utils/config';
import { OwnerProspect } from '../models/OwnerProspect';
import { toJSON } from '../utils/fetchUtils';

const createOwnerProspect = async (
  ownerProspect: OwnerProspect
): Promise<OwnerProspect> => {
  const response = await fetch(`${config.apiEndpoint}/api/owner-prospects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ownerProspect),
  });
  if (!response.ok) {
    throw new Error('Une erreur s’est produite.');
  }
  return toJSON(response);
};

const ownerProspectService = {
  createOwnerProspect,
};

export default ownerProspectService;

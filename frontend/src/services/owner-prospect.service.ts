import config from '../utils/config';
import { OwnerProspect } from '../models/OwnerProspect';

const createOwnerProspect = async (
  ownerProspect: OwnerProspect
): Promise<OwnerProspect> => {
  return await fetch(`${config.apiEndpoint}/api/owner-prospects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ownerProspect),
  }).then((_) => _.json());
};

const ownerProspectService = {
  createOwnerProspect,
};

export default ownerProspectService;

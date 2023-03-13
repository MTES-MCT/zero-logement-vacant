import config from '../utils/config';
import {
  ContactPoint,
  DraftContactPoint,
} from '../../../shared/models/ContactPoint';
import { createHttpService, toJSON } from '../utils/fetchUtils';

const http = createHttpService('contact-points', {
  host: config.apiEndpoint,
  authenticated: true,
  json: true,
});

const find = async (): Promise<ContactPoint[]> => {
  const response = await http.get('/api/contact-points');
  return toJSON(response);
};

const create = async (
  draftContactPoint: DraftContactPoint
): Promise<ContactPoint> => {
  const response = await http.fetch('/api/contact-points', {
    method: 'POST',
    body: JSON.stringify(draftContactPoint),
  });
  return response.json();
};

const update = async (contactPoint: ContactPoint): Promise<void> => {
  const { id, ...body } = contactPoint;
  await http.put(`/api/contact-points/${id}`, {
    body: JSON.stringify(body),
  });
};

const remove = async (contactPointId: string): Promise<void> => {
  await http.delete(`/api/contact-points/${contactPointId}`);
};

const contactPointService = {
  find,
  create,
  update,
  remove,
};

export default contactPointService;

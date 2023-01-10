import config from '../utils/config';
import authService from './auth.service';
import { ContactPoint, DraftContactPoint } from '../models/ContactPoint';

const listContactPoints = async (): Promise<ContactPoint> => {
  return await fetch(`${config.apiEndpoint}/api/contact-points`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  }).then((_) => _.json());
};

const createContactPoint = async (
  draftContactPoint: DraftContactPoint
): Promise<void> => {
  return await fetch(`${config.apiEndpoint}/api/contact-points`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draftContactPoint),
  }).then(() => {});
};

const updateContactPoint = async (
  contactPoint: ContactPoint
): Promise<void> => {
  const { id, ...body } = contactPoint;
  return await fetch(`${config.apiEndpoint}/api/contact-points/${id}`, {
    method: 'PUT',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(() => {});
};

const deleteContactPoint = async (contactPointId: string): Promise<void> => {
  return await fetch(
    `${config.apiEndpoint}/api/contact-points/${contactPointId}`,
    {
      method: 'DELETE',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
    }
  ).then(() => {});
};

const contactPointService = {
  listContactPoints,
  createContactPoint,
  updateContactPoint,
  deleteContactPoint,
};

export default contactPointService;

import jwt from 'jsonwebtoken';
import type { JsonBodyType, StrictRequest } from 'msw';

import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO, type AuthUser } from '~/models/User';
import data from './data';

/**
 * Attempt to decode authentication information from the request.
 * @param request
 * @returns The access token, authenticated user and establishment, or null if decoding failed.
 */
export function decodeAuth<Body extends JsonBodyType>(
  request: StrictRequest<Body>
): AuthUser | null {
  const accessToken = request.headers.get('X-Access-Token') ?? '';
  if (!accessToken) {
    return null;
  }

  const payload = jwt.decode(accessToken, { json: true });
  const { userId, establishmentId } = payload as {
    userId: string;
    establishmentId: string;
    role: string;
  };
  const user = data.users.find((user) => user.id === userId);
  const establishment = data.establishments.find(
    (establishment) => establishment.id === establishmentId
  );
  if (!user || !establishment) {
    return null;
  }

  return {
    accessToken,
    user: fromUserDTO(user),
    establishment: fromEstablishmentDTO(establishment)
  };
}

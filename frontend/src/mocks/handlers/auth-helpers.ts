import type { EstablishmentDTO, UserDTO } from '@zerologementvacant/models';

import data from './data';

export function getMockSession(): {
  user: UserDTO;
  establishment: EstablishmentDTO;
} | null {
  const user = data.users.find((user) => user.id === data.authSession.userId);
  const establishment = data.establishments.find(
    (establishment) => establishment.id === data.authSession.establishmentId
  );
  if (!user || !establishment) {
    return null;
  }

  return {
    user,
    establishment
  };
}

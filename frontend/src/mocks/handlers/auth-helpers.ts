import type { EstablishmentDTO, UserDTO } from '@zerologementvacant/models';

import data from './data';

export function getMockSession(): {
  user: UserDTO;
  establishment: EstablishmentDTO;
} | null {
  const user = data.users[0];
  const establishment =
    data.establishments.find(
      (establishment) => establishment.id === user?.establishmentId
    ) ?? data.establishments[0];
  if (!user || !establishment) {
    return null;
  }

  return {
    user,
    establishment
  };
}

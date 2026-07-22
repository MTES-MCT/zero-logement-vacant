import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';

import { getMockSession } from '../auth-helpers';
import data from '../data';

describe('getMockSession', () => {
  it('returns the explicitly authenticated user instead of the first fixture', () => {
    const firstEstablishment = genEstablishmentDTO();
    const authenticatedEstablishment = genEstablishmentDTO();
    const firstUser = genUserDTO(undefined, firstEstablishment);
    const authenticatedUser = genUserDTO(undefined, authenticatedEstablishment);
    data.establishments.push(firstEstablishment, authenticatedEstablishment);
    data.users.push(firstUser, authenticatedUser);
    data.authSession.userId = authenticatedUser.id;
    data.authSession.establishmentId = authenticatedEstablishment.id;

    expect(getMockSession()).toEqual({
      user: authenticatedUser,
      establishment: authenticatedEstablishment
    });
  });
});

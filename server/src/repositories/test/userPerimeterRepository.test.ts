import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

describe('User perimeter repository', () => {
  it('stores one perimeter per user and establishment', async () => {
    const establishment = genEstablishmentApi();
    const anotherEstablishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(toUserDBO(user));

    await userPerimeterRepository.upsert({
      userId: user.id,
      establishmentId: establishment.id,
      geoCodes: [],
      departments: [],
      regions: [],
      epci: [establishment.siren],
      frEntiere: false,
      updatedAt: new Date().toJSON()
    });
    await userPerimeterRepository.upsert({
      userId: user.id,
      establishmentId: anotherEstablishment.id,
      geoCodes: [],
      departments: [],
      regions: [],
      epci: [anotherEstablishment.siren],
      frEntiere: false,
      updatedAt: new Date().toJSON()
    });

    const perimeter = await userPerimeterRepository.get(
      user.id,
      establishment.id
    );
    const anotherPerimeter = await userPerimeterRepository.get(
      user.id,
      anotherEstablishment.id
    );

    expect(perimeter?.epci).toStrictEqual([establishment.siren]);
    expect(anotherPerimeter?.epci).toStrictEqual([anotherEstablishment.siren]);
  });
});

import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import { factories } from '~/test/factories';

describe('User perimeter repository', () => {
  it('stores one perimeter per user and establishment', async () => {
    const establishment = await factories.establishment.create();
    const anotherEstablishment = await factories.establishment.create();
    const user = await factories.user.create({
      establishmentId: establishment.id
    });

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

import randomstring from 'randomstring';

import { detectDomain, UserApi } from '~/models/UserApi';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

describe('UserApi', () => {
  describe('detectDomain', () => {
    const establishment = genEstablishmentApi();

    const createUser = (domain: string): UserApi => ({
      ...genUserApi(establishment.id),
      email: `${randomstring.generate({
        length: 4,
        readable: true,
      })}@${domain}`,
    });

    it('should return the domain that appears the most among users', () => {
      const users = [
        ...new Array(2).fill(0).map(() => createUser('more.com')),
        ...new Array(1).fill(0).map(() => createUser('less.com'))
      ];

      const actual = detectDomain(users);

      expect(actual).toStrictEqual('more.com');
    });

    it('should filter out some famous domain names', () => {
      const users = [
        ...new Array(2).fill(0).map(() => createUser('gmail.com')),
        ...new Array(1).fill(0).map(() => createUser('more.com'))
      ];

      const actual = detectDomain(users);

      expect(actual).toBe('more.com');
    });

    it('should return null if the array is empty', () => {
      const users: UserApi[] = [];

      const actual = detectDomain(users);

      expect(actual).toBeNull();
    });
  });
});

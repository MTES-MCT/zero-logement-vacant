import { HousingStatusApi } from '../HousingStatusApi';
import { HousingApi } from '../HousingApi';
import { genHousingApi } from '../../test/testFixtures';

describe('HousingApi', () => {
  describe('isVacant', () => {
    test.each`
      status                             | expected
      ${HousingStatusApi.NeverContacted} | ${false}
      ${HousingStatusApi.Waiting}        | ${false}
      ${HousingStatusApi.FirstContact}   | ${false}
      ${HousingStatusApi.InProgress}     | ${true}
      ${HousingStatusApi.NotVacant}      | ${true}
      ${HousingStatusApi.NoAction}       | ${false}
      ${HousingStatusApi.Exit}           | ${true}
    `(
      'should be {expected} when the status is {status}',
      ({ status, expected }) => {
        const housing: HousingApi = { ...genHousingApi(), status };
        const actual =
          housing.status !== undefined &&
          [
            HousingStatusApi.InProgress,
            HousingStatusApi.NotVacant,
            HousingStatusApi.Exit,
          ].includes(housing.status);
        expect(actual).toBe(expected);
      }
    );
  });
});

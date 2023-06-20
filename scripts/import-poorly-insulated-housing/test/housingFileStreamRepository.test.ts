import path from 'path';

import createHousingFileStream from '../housingFileStreamRepository';

describe('Housing file stream repository', () => {
  const repository = createHousingFileStream(
    path.join(__dirname, 'non-vacant-housing.csv')
  );

  describe('stream', () => {
    const stream = repository.stream({
      geoCodes: ['75056'],
    });

    it('should stream housing', (done) => {
      stream.toArray((housingList) => {
        try {
          expect(housingList).toBeArrayOfSize(10);

          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});

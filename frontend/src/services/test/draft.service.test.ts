import { emptyToNull } from '../draft.service';

describe('Draft service', () => {
  describe('emptyToNull', () => {
    it('should transform empty strings to null', async () => {
      const input = {
        subject: '',
        body: 'Some body',
        logo: '',
        writtenAt: '2023-10-01T00:00:00Z',
        writtenFrom: ''
      };

      const actual = emptyToNull(input);

      expect(actual).toStrictEqual({
        subject: null,
        body: 'Some body',
        logo: null,
        writtenAt: '2023-10-01T00:00:00Z',
        writtenFrom: null
      });
    });
  });
});

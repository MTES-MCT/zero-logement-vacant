import SortApi from '~/models/SortApi';

describe('SortApi', () => {
  it('should parse keys from a query parameter', () => {
    const actual = SortApi.parse(['email', '-age']);

    expect(actual).toStrictEqual({
      email: 'asc',
      age: 'desc',
    });
  });
});

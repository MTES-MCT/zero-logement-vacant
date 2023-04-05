import SortApi from '../SortApi';

describe('SortApi', () => {
  it('should parse keys from a query parameter', () => {
    const actual = SortApi.parse('email,-age');

    expect(actual).toStrictEqual({
      email: 'asc',
      age: 'desc',
    });
  });
});

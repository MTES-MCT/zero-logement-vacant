import { geoCode } from '../geo-code';

describe('Geo code', () => {
  const goods = ['01000', '2A000', '2B000', '10000', '99999', '   01000   '];

  it.each(goods)('should validate %s', (code) => {
    const validate = () => geoCode.validateSync(code);

    expect(validate).not.toThrow();
  });

  const bads = [null, '', '     ', '00000', '00999'];

  it.each(bads)('should fail to validate %s', (code) => {
    const validate = () => geoCode.validateSync(code);

    expect(validate).toThrow();
  });
});

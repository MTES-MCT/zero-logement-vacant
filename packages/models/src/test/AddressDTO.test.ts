import { AddressDTO, AddressKinds, formatAddress } from '../AddressDTO';

describe('AddressDTO', () => {
  describe('formatAddress', () => {
    it('should return only the filled parameters', () => {
      const address: AddressDTO = {
        refId: 'owner.id',
        addressKind: AddressKinds.Owner,
        postalCode: '01000',
        city: 'Bourg-en-Bresse',
      };

      const actual = formatAddress(address);

      expect(actual).toIncludeAllMembers(['01000 Bourg-en-Bresse']);
    });

    it('should return the address formatted', () => {
      const address: AddressDTO = {
        refId: 'owner.id',
        addressKind: AddressKinds.Owner,
        houseNumber: '1',
        street: 'rue de la paix',
        postalCode: '01000',
        city: 'Bourg-en-Bresse',
      };
      const additionalAddress = 'Appart. 1';

      const actual = formatAddress(address, additionalAddress);

      expect(actual).toIncludeAllMembers([
        '1 rue de la paix',
        'Appart. 1',
        '01000 Bourg-en-Bresse',
      ]);
    });
  });
});
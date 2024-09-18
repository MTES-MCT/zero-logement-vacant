import { AddressDTO, AddressKinds, formatAddress } from '../AddressDTO';

describe('AddressDTO', () => {
  describe('formatAddress', () => {
    it('should return the label', () => {
      const address: AddressDTO = {
        refId: 'owner.id',
        addressKind: AddressKinds.Owner,
        label: '01000 Bourg-en-Bresse',
        postalCode: '01000',
        city: 'Bourg-en-Bresse'
      };

      const actual = formatAddress(address);

      expect(actual).toStrictEqual(['01000 Bourg-en-Bresse']);
    });

    it('should return the address formatted', () => {
      const address: AddressDTO = {
        refId: 'owner.id',
        addressKind: AddressKinds.Owner,
        label: '1 rue de la paix 01000 Bourg-en-Bresse',
        houseNumber: '1',
        street: 'rue de la paix',
        postalCode: '01000',
        city: 'Bourg-en-Bresse'
      };
      const additionalAddress = 'Appart. 1';

      const actual = formatAddress(address, additionalAddress);

      expect(actual).toStrictEqual([
        'Appart. 1',
        '1 rue de la paix',
        '01000 Bourg-en-Bresse'
      ]);
    });

    it('should handle the "Corse-du-Sud" edge case', () => {
      const address: AddressDTO = {
        refId: 'owner.id',
        addressKind: AddressKinds.Owner,
        label: '1 cours Napoléon 2A000 Ajaccio',
        houseNumber: '1',
        street: 'cours Napoléon',
        postalCode: '2A000',
        city: 'Ajaccio'
      };
      const additionalAddress = 'Sur la colline';

      const actual = formatAddress(address, additionalAddress);

      expect(actual).toStrictEqual([
        'Sur la colline',
        '1 cours Napoléon',
        '2A000 Ajaccio'
      ]);
    });

    it('should handle the "Haute-Corse" edge case', () => {
      const address: AddressDTO = {
        refId: 'owner.id',
        addressKind: AddressKinds.Owner,
        label: '1 cours Napoléon 2B000 Bastia',
        houseNumber: '1',
        street: 'cours Napoléon',
        postalCode: '2B000',
        city: 'Bastia'
      };
      const additionalAddress = 'Sur la colline';

      const actual = formatAddress(address, additionalAddress);

      expect(actual).toStrictEqual([
        'Sur la colline',
        '1 cours Napoléon',
        '2B000 Bastia'
      ]);
    });
  });
});

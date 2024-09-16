import {
  compare,
  isStreetNumber,
  MATCH_THRESHOLD,
  needsManualReview,
  preprocessAddress,
  REVIEW_THRESHOLD
} from '../duplicates';
import { genOwnerApi } from '~/test/testFixtures';
import { OwnerApi } from '~/models/OwnerApi';
import { ScoredOwner } from '../../models/Comparison';

describe('Duplicates', () => {
  function genOwner(rawAddress: string[], birthDate?: Date): OwnerApi {
    return {
      ...genOwnerApi(),
      rawAddress,
      birthDate: birthDate?.toJSON()
    };
  }

  describe('compare', () => {
    test.each`
      a                                                                                          | b
      ${genOwner(['0017 RUE DE LA GABARRE', '64500 SAINT-JEAN-DE-LUZ'])}                         | ${genOwner(['17 RUE DE LA GABARRE', 'SAINT JEAN DE LUZ', '64500 ST JEAN DE LUZ'])}
      ${genOwner(['0025 RUE DE MEAUX', '77950 SAINT-GERMAIN-LAXIS'])}                            | ${genOwner(['25 RUE DE MEAUX', 'SAINT GERMAIN LAXIS', '77950 ST GERMAIN LAXIS'])}
      ${genOwner(['0017 BD  DES COTES', '73100 AIX LES BAINS'])}                                 | ${genOwner(['VILLA MIREILLE', '0017 BD  DES COTES', '73100 AIX LES BAINS'])}
      ${genOwner(['CHE DE BRANTES', '84550 MORNAS'])}                                            | ${genOwner(['0152 CHE DE BRANTES', '84550 MORNAS'])}
      ${genOwner(['BAT B', '0219 RUE DU COMMANDANT ROLLAND', '13008 MARSEILLE'])}                | ${genOwner(['219 RUE DU COMMANDANT ROLLAND', '13008 MARSEILLE'])}
      ${genOwner(['218 RUE CLEMENCEAU', 'SAINTE MARIE AUX MINES', '68160 STE MARIE AUX MINES'])} | ${genOwner(['0218 RUE CLEMENCEAU', '68160 SAINTE-MARIE-AUX-MINES'])}
      ${genOwner(["4 CARROI DU PLAT D'ETAIN", '37370 NEUVY LE ROI'])}                            | ${genOwner(["0004 RUE DU CARROI DU PLAT D'ETAIN", '37370 NEUVY LE ROI'], new Date('1944-02-17'))}
      ${genOwner(['8 COUR DU TERTRE', '22100 ST SAMSON SUR RANCE'])}                             | ${genOwner(['0008 COURDU TERTRE', '22100 SAINT-SAMSON-SUR-RANCE'])}
      ${genOwner(['8 COURDU TERTRE', 'SAINT SAMSON SUR RANCE', '22100 ST SAMSON SUR RANCE'])}    | ${genOwner(['0008 COURDU TERTRE', '22100 SAINT-SAMSON-SUR-RANCE'])}
      ${genOwner(['0006 PL  JEANNINE MICHEAU', '31200 TOULOUSE'])}                               | ${genOwner(['PAR M NON', '6 PL JEANNINE MICHEAU', '31200 TOULOUSE'])}
      ${genOwner(['PAR M DUPONT JEAN', '4 RUE LOUIS DEBRONS', '15000 AURILLAC'])}                | ${genOwner(['CHEZ DUPONT JEAN', '4T RUE LOUIS DEBRONS', '15000 AURILLAC'])}
      ${genOwner(['1 RUE BERTHE', '93400 ST OUEN SUR SEINE'])}                                   | ${genOwner(['1 RUE BERTHE', 'SAINT OUEN SUR SEINE', '93400 ST OUEN SUR SEINE'])}
    `('should match $a.rawAddress with $b.rawAddress', async ({ a, b }) => {
      const actual = compare(a, b);
      expect(actual).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    });

    test.each`
      a                                                                            | b
      ${genOwner(['62 AV DE LA ROUDET', 'RES LE PINTEY', '33500 LIBOURNE'])}       | ${genOwner(['0168 AV  DU PRESIDENT WILSON', '93100 MONTREUIL'])}
      ${genOwner(['0015 RUE DES SEIGNEURS', '68740 BALGAU'])}                      | ${genOwner(['0014 RUE DES GLACIERES', '67000 STRASBOURG'])}
      ${genOwner(['6 RUE DU DOLMEN', '79400 NANTEUIL'])}                           | ${genOwner(['10 RUE DU RONCEY', '78920 ECQUEVILLY'])}
      ${genOwner(['PAR MR OLIVIER', '0067 RUE DES CHARRETIERS', '45000 ORLEANS'])} | ${genOwner(['600 R PIERRE BROSSOLETTE LABUISS', '62700 BRUAY LA BUISSIERE'])}
      ${genOwner(['3 ALL DE LA BEAUCE', '78640 ST GERMAIN DE LA GRANGE'])}         | ${genOwner(['0001 PL  DE L ECOLE', '95400 VILLIERS LE BEL'])}
      ${genOwner(['PAR M CLAUDE', '0125 RUE SAINT CHARLES', '75015 PARIS'])}       | ${genOwner(['0005 RUE DU COLONEL TIFFOINET', '51200 EPERNAY'])}
      ${genOwner(['PAR MR JEAN', 'RUE DES LANDES', '72110 BEAUFAY'])}              | ${genOwner(['0602 RTE DES LANDES', '72110 BEAUFAY'])}
      ${genOwner(['4 RUE ADRIEN SIMONNOT', '21700 COMBLANCHIEN'])}                 | ${genOwner(['PAR M INCONNU', 'LES COMBES', '71170 SAINT-IGNY-DE-ROCHE'])}
    `('should not match $a.rawAddress with $b.rawAddress', async ({ a, b }) => {
      const actual = compare(a, b);
      expect(actual).toBeLessThan(MATCH_THRESHOLD);
    });
  });

  describe('isStreetNumber', () => {
    test.each`
      address                      | expected
      ${'0017 RUE DE LA GABARRE'}  | ${true}
      ${'64500 SAINT-JEAN-DE-LUZ'} | ${false}
    `(`should be $expected for $address`, ({ address, expected }) => {
      const actual = isStreetNumber(address);
      expect(actual).toBe(expected);
    });
  });

  describe('preprocessAddress', () => {
    test.each`
      address                                                                      | expected
      ${['CHEZ M. LE MAIRE', '0017 RUE DE LA GABARRE', '64500 SAINT-JEAN-DE-LUZ']} | ${'CHEZ M. LE MAIRE 17 RUE DE LA GABARRE 64500 SAINT-JEAN-DE-LUZ'}
      ${['0017 RUE DE LA GABARRE', '64500 SAINT-JEAN-DE-LUZ']}                     | ${'17 RUE DE LA GABARRE 64500 SAINT-JEAN-DE-LUZ'}
    `('should preprocess $address', ({ address, expected }) => {
      const actual = preprocessAddress(address);
      expect(actual).toBe(expected);
    });
  });

  describe('needsManualReview', () => {
    it('should need review if every duplicate needs a review', () => {
      const source = genOwnerApi();
      const duplicates: ScoredOwner[] = [
        {
          score: REVIEW_THRESHOLD,
          value: {
            ...genOwnerApi(),
            birthDate: undefined
          }
        },
        {
          score: REVIEW_THRESHOLD,
          value: {
            ...genOwnerApi(),
            birthDate: undefined
          }
        }
      ];

      const actual = needsManualReview(source, duplicates);

      expect(actual).toBeTrue();
    });

    it('should need review if some matches have a different birth date', async () => {
      const source: OwnerApi = {
        ...genOwnerApi(),
        birthDate: new Date('2000-01-01').toJSON()
      };
      const duplicates: ScoredOwner[] = [
        {
          score: MATCH_THRESHOLD,
          value: {
            ...genOwnerApi(),
            birthDate: new Date('1999-02-03').toJSON()
          }
        },
        {
          score: MATCH_THRESHOLD,
          value: { ...genOwnerApi(), birthDate: undefined }
        }
      ];

      const actual = needsManualReview(source, duplicates);

      expect(actual).toBeTrue();
    });

    it('should need review if there is a perfect match and it has a different birth date', () => {
      const source: OwnerApi = {
        ...genOwnerApi(),
        birthDate: new Date('2000-01-01').toJSON()
      };
      const duplicates: ScoredOwner[] = [
        {
          score: 1,
          value: {
            ...genOwnerApi(),
            birthDate: new Date('1999-01-01').toJSON()
          }
        }
      ];

      const actual = needsManualReview(source, duplicates);

      expect(actual).toBeTrue();
    });

    it('should not need review if at most one birth date is filled', () => {
      const source: OwnerApi = { ...genOwnerApi(), birthDate: undefined };
      const duplicates: ScoredOwner[] = [
        {
          score: MATCH_THRESHOLD,
          value: {
            ...genOwnerApi(),
            birthDate: new Date('2000-01-01').toJSON()
          }
        },
        {
          score: MATCH_THRESHOLD,
          value: { ...genOwnerApi(), birthDate: undefined }
        }
      ];

      const actual = needsManualReview(source, duplicates);

      expect(actual).toBeFalse();
    });
  });
});

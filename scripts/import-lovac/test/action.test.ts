import { v4 as uuidv4 } from 'uuid';

import { genHousingApi, genOwnerApi } from '../../../server/test/testFixtures';
import { HousingStatusApi } from '../../../server/models/HousingStatusApi';
import { HousingEventApi } from '../../../server/models/EventApi';
import { compare } from '../action';
import { Modification, ModificationKind } from '../modification';
import { HousingApi } from '../../../server/models/HousingApi';

describe('Action', () => {
  describe('compare', () => {
    describe('If the housing was present in the vacant file', () => {
      const before = genHousingApi();

      describe('If it is missing now', () => {
        const now = null;

        it('should keep dataYears untouched', () => {
          const action = compare({ before, now, modifications: [] });

          expect(action.housing?.dataYears).toStrictEqual(before.dataYears);
        });

        describe('If it is untouched', () => {
          const modifications: Modification[] = [];

          describe('If the owner was never contacted', () => {
            beforeAll(() => {
              before.status = HousingStatusApi.NeverContacted;
            });

            it('should change the housing status to "exit"', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing?.status).toBe(HousingStatusApi.Exit);
              expect(action.housing?.subStatus).toBe(
                'Absent du millésime suivant'
              );
            });
          });

          describe('If the housing is not vacant', () => {
            it.each`
              status
              ${HousingStatusApi.Waiting}
              ${HousingStatusApi.NotVacant}
              ${HousingStatusApi.Exit}
            `(
              'should change the housing status from $status to "exit"',
              ({ status }) => {
                before.status = status;

                const action = compare({ before, now, modifications });

                expect(action.housing?.status).toBe(HousingStatusApi.Exit);
                expect(action.housing?.subStatus).toBe(
                  'Absent du millésime suivant'
                );
              }
            );
          });

          describe('If the owner was contacted and the housing has another status', () => {
            beforeAll(() => {
              before.status = HousingStatusApi.FirstContact;
            });

            it('should create an occupancy conflict event', () => {
              const action = compare({ before, now, modifications });

              expect(action.events).toBeArrayOfSize(1);
              expect(action.events[0]).toMatchObject<Partial<HousingEventApi>>({
                name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
                kind: 'Create',
                category: 'Followup',
                section: 'Situation',
                conflict: true,
                housingId: before.id,
                old: before,
                new: undefined,
                createdBy: 'system',
              });
            });
          });
        });

        describe('If the ownership was modified by the establishment', () => {
          const modifications: Modification[] = [
            {
              id: uuidv4(),
              kind: ModificationKind.HousingOwnersUpdate,
            },
          ];

          it('should create an ownership conflict event', () => {
            const action = compare({ before, now, modifications });

            expect(action.events).toContainEqual<HousingEventApi>({
              id: expect.any(String),
              name: 'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété',
              kind: 'Create',
              category: 'Ownership',
              section: 'Propriétaire',
              conflict: true,
              housingId: before.id,
              old: before,
              new: undefined,
              createdBy: 'system',
              createdAt: expect.toBeDate(),
            });
          });

          describe('If the housing is not vacant', () => {
            it.each`
              status
              ${HousingStatusApi.Waiting}
              ${HousingStatusApi.NotVacant}
              ${HousingStatusApi.Exit}
            `(
              'should change the housing status from $status to "exit"',
              ({ status }) => {
                before.status = status;

                const action = compare({ before, now, modifications });

                expect(action.housing?.status).toBe(HousingStatusApi.Exit);
                expect(action.housing?.subStatus).toBe(
                  'Absent du millésime suivant'
                );
              }
            );
          });

          describe.each`
            status
            ${HousingStatusApi.NoAction}
            ${HousingStatusApi.InProgress}
            ${HousingStatusApi.FirstContact}
          `('If it is vacant (status: $status)', ({ status }) => {
            beforeAll(() => {
              before.status = status;
            });

            it('should create an occupancy conflict event', () => {
              const action = compare({ before, now, modifications });

              expect(action.events).toContainEqual<HousingEventApi>({
                id: expect.any(String),
                name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
                kind: 'Create',
                category: 'Followup',
                section: 'Situation',
                conflict: true,
                housingId: before.id,
                old: before,
                new: undefined,
                createdBy: 'system',
                createdAt: expect.toBeDate(),
              });
            });
          });

          describe('If the owner was never contacted', () => {
            beforeAll(() => {
              before.status = HousingStatusApi.NeverContacted;
            });

            it('should leave the housing untouched', () => {
              const action = compare({ before, now, modifications });

              expect(action).toStrictEqual({
                housing: null,
                events: [],
              });
            });
          });
        });
      });

      describe('If it is still present', () => {
        const now: HousingApi = {
          ...genHousingApi(),
          owner: before.owner,
        };

        describe('If it is untouched', () => {
          const modifications: Modification[] = [];

          describe('If the owner was never contacted', () => {
            beforeAll(() => {
              before.status = HousingStatusApi.NeverContacted;
            });

            it('should erase all data', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing).toStrictEqual({
                ...now,
                id: before.id,
                dataYears: [...now.dataYears, ...before.dataYears],
              });
            });
          });

          describe.each`
            status
            ${HousingStatusApi.NotVacant}
            ${HousingStatusApi.Exit}
          `('If it is not vacant (status: $status)', ({ status }) => {
            beforeAll(() => {
              before.status = status;
            });

            it('should erase ownership data', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing).toStrictEqual<HousingApi>({
                ...before,
                owner: now.owner,
                coowners: now.coowners,
                dataYears: [...now.dataYears, ...before.dataYears],
              });
            });

            it('should create an occupancy conflict event', () => {
              const action = compare({ before, now, modifications });

              expect(action.events).toContainEqual<HousingEventApi>({
                id: expect.any(String),
                name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
                kind: 'Create',
                category: 'Followup',
                section: 'Situation',
                conflict: true,
                housingId: before.id,
                old: before,
                new: now,
                createdBy: 'system',
                createdAt: expect.toBeDate(),
              });
            });
          });

          describe.each`
            status
            ${HousingStatusApi.Waiting}
            ${HousingStatusApi.FirstContact}
            ${HousingStatusApi.InProgress}
            ${HousingStatusApi.NoAction}
          `('If it has another status (status: $status)', ({ status }) => {
            beforeAll(() => {
              before.status = status;
            });

            it('should erase ownership data', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing).toStrictEqual<HousingApi>({
                ...before,
                owner: now.owner,
                coowners: now.coowners,
                dataYears: [...now.dataYears, ...before.dataYears],
              });
            });
          });

          describe('If the main owner has changed', () => {
            beforeAll(() => {
              now.owner = genOwnerApi();
            });

            it('should create an ownership update event', () => {
              const action = compare({ before, now, modifications });

              expect(action.events).toContainEqual<HousingEventApi>({
                id: expect.any(String),
                name: 'Changement de propriétaire principal',
                kind: 'Update',
                category: 'Ownership',
                section: 'Propriétaire',
                conflict: false,
                housingId: before.id,
                old: before,
                new: now,
                createdBy: 'system',
                createdAt: expect.toBeDate(),
              });
            });
          });
        });

        describe('If the ownership was modified by the establishment', () => {
          const modifications: Modification[] = [
            {
              id: uuidv4(),
              kind: ModificationKind.HousingOwnersUpdate,
            },
          ];

          it('should create an ownership conflict event', () => {
            const action = compare({ before, now, modifications });

            expect(action.events).toContainEqual<HousingEventApi>({
              id: expect.any(String),
              name: 'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété',
              kind: 'Create',
              category: 'Ownership',
              section: 'Propriétaire',
              conflict: true,
              housingId: before.id,
              old: before,
              new: now,
              createdBy: 'system',
              createdAt: expect.toBeDate(),
            });
          });

          describe('If the owner was never contacted', () => {
            beforeAll(() => {
              before.status = HousingStatusApi.NeverContacted;
            });

            it('should erase ownership data', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing).toStrictEqual<HousingApi>({
                ...before,
                id: before.id,
                owner: now.owner,
                coowners: now.coowners,
                dataYears: [...now.dataYears, ...before.dataYears],
              });
            });
          });

          describe.each`
            status
            ${HousingStatusApi.NotVacant}
            ${HousingStatusApi.Exit}
          `('If the housing is not vacant (status: $status)', ({ status }) => {
            beforeAll(() => {
              before.status = status;
            });

            it('should remain the same', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing).toStrictEqual({
                ...before,
                dataYears: [...now.dataYears, ...before.dataYears],
              });
            });

            it('should create an occupancy conflict event', () => {
              const action = compare({ before, now, modifications });

              expect(action.events).toContainEqual<Partial<HousingEventApi>>({
                id: expect.any(String),
                name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation',
                kind: 'Create',
                category: 'Followup',
                section: 'Situation',
                conflict: true,
                housingId: before.id,
                old: before,
                new: now,
                createdBy: 'system',
                createdAt: expect.toBeDate(),
              });
            });
          });

          describe.each`
            status
            ${HousingStatusApi.Waiting}
            ${HousingStatusApi.FirstContact}
            ${HousingStatusApi.InProgress}
            ${HousingStatusApi.NoAction}
          `('If it has another status (status: $status)', ({ status }) => {
            beforeAll(() => {
              before.status = status;
            });

            it('should remain the same', () => {
              const action = compare({ before, now, modifications });

              expect(action.housing).toStrictEqual({
                ...before,
                dataYears: [...now.dataYears, ...before.dataYears],
              });
            });
          });
        });
      });
    });

    describe('If the housing was missing and is now vacant', () => {
      const before = null;
      const modifications: Modification[] = [];
      const now = genHousingApi();

      it('should add the current year to dataYears', () => {
        const action = compare({ before, now, modifications });

        expect(action.housing?.dataYears).toStrictEqual(now.dataYears);
      });

      it('should create an occupancy update event', () => {
        const action = compare({ before, now, modifications });

        expect(action.events).toContainEqual<HousingEventApi>({
          id: expect.any(String),
          name: 'Changement de statut d’occupation',
          kind: 'Update',
          category: 'Followup',
          section: 'Situation',
          conflict: false,
          housingId: now.id,
          old: undefined,
          new: now,
          createdBy: 'system',
          createdAt: expect.toBeDate(),
        });
      });

      it('should save the housing', () => {
        const action = compare({ before, now, modifications });

        expect(action.housing).toStrictEqual(now);
      });
    });
  });
});

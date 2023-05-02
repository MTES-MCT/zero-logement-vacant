import { compare } from '../housing';
import { genHousingApi } from '../../../server/test/testFixtures';
import { HousingStatusApi } from '../../../server/models/HousingStatusApi';
import { EventApi } from '../../../server/models/EventApi';
import { Event } from '../event';
import { HousingApi } from '../../../server/models/HousingApi';

describe('Housing', () => {
  describe('compare', () => {
    describe('If the housing was present', () => {
      const before = genHousingApi();

      describe('If it is missing now', () => {
        const now = null;

        describe('If it was never contacted nor modified', () => {
          const modifications: EventApi[] = [];

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

        describe('If the housing has another status and was not modified', () => {
          const modifications: EventApi[] = [];

          beforeAll(() => {
            before.status = HousingStatusApi.FirstContact;
          });

          it('should create an occupancy conflict event', () => {
            const action = compare({ before, now, modifications });

            expect(action.events).toSatisfyAny(
              (event: Event<HousingApi>) => event.conflict // && category
            );
          });
        });

        describe('If the ownership was modified by the establishment', () => {
          describe('If the housing is not vacant', () => {
            it.todo('should create an ownership conflict event');

            it.todo('should create an occupancy conflict event');
          });
        });
      });

      describe('If it is still present', () => {
        // const now = genHousingApi();

        describe('If it was not modified', () => {
          describe('If it was set as "never contacted"', () => {
            it.todo('should erase all data');
          });

          describe('If it was set as "not vacant"', () => {
            it.todo('should erase ownership data');

            it.todo('should create an occupancy conflict event');
          });

          describe('If it has another status', () => {
            it.todo('should erase ownership data');
          });

          describe('In any case, if the new owner is different', () => {
            it.todo('should create an ownership update event');
          });
        });

        describe('If it was modified by the establishment', () => {
          it.todo('should create an ownership conflict event');

          describe('If it was set as "never contacted"', () => {
            it.todo('should erase ownership data');
          });

          describe('If it was set as "not vacant"', () => {
            it.todo('should remain the same');

            it.todo('should create an occupancy conflict event');
          });
        });
      });
    });
  });
});

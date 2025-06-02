import { render, screen } from '@testing-library/react';
import { Occupancy } from '@zerologementvacant/models';
import { Provider } from 'react-redux';

import { genEvent, genUser } from '../../../../test/fixtures.test';
import { Event } from '../../../models/Event';
import { Note } from '../../../models/Note';
import { User, UserRoles } from '../../../models/User';
import configureTestStore from '../../../utils/test/storeUtils';
import EventsHistory from '../EventsHistory';

interface RenderComponentProps {
  events: Event[];
  notes: Note[];
}

describe('EventsHistory', () => {
  function renderComponent({ events, notes }: RenderComponentProps) {
    const store = configureTestStore();
    render(
      <Provider store={store}>
        <EventsHistory events={events} notes={notes} />
      </Provider>
    );
  }

  const admin: User = {
    ...genUser(),
    role: UserRoles.Admin,
    firstName: 'Zéro',
    lastName: 'Logement Vacant',
    establishmentId: undefined
  };

  it('should sort events by date and time descending', () => {
    renderComponent({
      events: [
        {
          ...genEvent({
            type: 'housing:created',
            creator: admin,
            nextOld: null,
            nextNew: { source: 'lovac-2019' }
          }),
          createdAt: new Date('2020-01-01T22:59:00Z').toJSON()
        },
        {
          ...genEvent({
            type: 'housing:occupancy-updated',
            creator: admin,
            nextOld: { occupancy: Occupancy.VACANT },
            nextNew: { occupancy: Occupancy.RENT }
          }),
          createdAt: new Date('2020-01-01T23:00:00Z').toJSON()
        }
      ],
      notes: []
    });

    const firstTitle = screen.getByText(
      'a mis à jour le statut d’occupation le 02/01/2020 à 00:00'
    );
    const secondTitle = screen.getByText(
      'a créé le logement le 01/01/2020 à 23:59'
    );
    expect(firstTitle?.compareDocumentPosition(secondTitle)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  describe('If some events happened the same day', () => {
    it('should aggregate them', async () => {
      renderComponent({
        events: [
          {
            ...genEvent({
              type: 'housing:created',
              creator: admin,
              nextOld: null,
              nextNew: { source: 'lovac-2019' }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          },
          {
            ...genEvent({
              type: 'housing:occupancy-updated',
              creator: admin,
              nextOld: { occupancy: Occupancy.VACANT },
              nextNew: { occupancy: Occupancy.RENT }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          }
        ],
        notes: []
      });

      const title = screen.queryByText(
        'a mis à jour des informations le 01/01/2020 à 13:00'
      );
      expect(title).toBeVisible();
      const description = screen.queryByText(
        'Le statut d’occupation est passé de “Vacant” à “Loué”'
      );
      expect(description).toBeVisible();
    });

    it('should display notes after events', async () => {
      // TODO
    });
  });

  describe('housing:created', () => {
    beforeEach(() => {
      renderComponent({
        events: [
          {
            ...genEvent({
              type: 'housing:created',
              creator: admin,
              nextOld: null,
              nextNew: { source: 'lovac-2019' }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          }
        ],
        notes: []
      });
    });

    it('should display a title', () => {
      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a importé ce logement'
      );
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020 à 13:00');
      expect(datetime).toBeVisible();
    });

    it('should display a description', () => {
      const description = screen.getByText(
        'Le logement a été créé via l’import de la base de données LOVAC 2019'
      );
      expect(description).toBeVisible();
    });
  });
});

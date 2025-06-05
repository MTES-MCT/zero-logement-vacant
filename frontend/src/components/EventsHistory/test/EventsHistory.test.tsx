import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import {
  HousingStatus,
  Occupancy,
  OwnerRank,
  PRECISION_BLOCKING_POINT_CATEGORY_VALUES,
  PRECISION_EVOLUTION_CATEGORY_VALUES,
  PRECISION_MECHANISM_CATEGORY_VALUES
} from '@zerologementvacant/models';
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

      const title = screen.queryByText('a mis à jour des informations');
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020 à 13:00');
      expect(datetime).toBeVisible();
      const description = screen.queryByText(
        'Le statut d’occupation est passé de “Vacant” à “Loué”'
      );
      expect(description).toBeVisible();
    });

    it.todo('should display notes after events');
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
        'Le logement a été créé via l’import de la base de données LOVAC 2019.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:occupancy-updated', () => {
    beforeEach(() => {
      renderComponent({
        events: [
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
    });

    it('should display a title', () => {
      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a mis à jour le statut d’occupation'
      );
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020 à 13:00');
      expect(datetime).toBeVisible();
    });

    it('should display a description', () => {
      const description = screen.getByText(
        'Le statut d’occupation est passé de “Vacant” à “En location”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:status-updated', () => {
    beforeEach(() => {
      renderComponent({
        events: [
          {
            ...genEvent({
              type: 'housing:status-updated',
              creator: admin,
              nextOld: { status: HousingStatus.NEVER_CONTACTED },
              nextNew: {
                status: HousingStatus.FIRST_CONTACT,
                subStatus: 'Intervention en cours'
              }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          }
        ],
        notes: []
      });
    });

    it('should display a title', () => {
      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a mis à jour le statut de suivi'
      );
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020 à 13:00');
      expect(datetime).toBeVisible();
    });

    it('should display the status change', () => {
      const description = screen.getByText(
        'Le statut de suivi du logement est passé de “Non suivi” à “Premier contact”.'
      );
      expect(description).toBeVisible();
    });

    it('should display the sub status change', () => {
      const description = screen.getByText(
        'Le sous-statut de suivi du logement est passé de vide à “Intervention en cours”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:precision-attached', () => {
    function renderComponentWithPrecisionAttached(
      payload: Event<'housing:precision-attached'>['nextNew']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:precision-attached',
            creator: admin,
            nextOld: null,
            nextNew: payload
          })
        ],
        notes: []
      });
    }

    const mechanism = faker.helpers.arrayElement(
      PRECISION_MECHANISM_CATEGORY_VALUES
    );
    const blockingPoint = faker.helpers.arrayElement(
      PRECISION_BLOCKING_POINT_CATEGORY_VALUES
    );
    const evolution = faker.helpers.arrayElement(
      PRECISION_EVOLUTION_CATEGORY_VALUES
    );

    it.each`
      category         | label
      ${mechanism}     | ${'un dispositif'}
      ${blockingPoint} | ${'un point de blocage'}
      ${evolution}     | ${'une évolution'}
    `('should display a title for $category', ({ category, label }) => {
      renderComponentWithPrecisionAttached({
        category,
        label: 'Précision de test'
      });

      const title = screen.getByText(
        `L’équipe Zéro Logement Vacant a ajouté ${label}`
      );
      expect(title).toBeVisible();
    });

    it.each`
      category         | expected
      ${mechanism}     | ${'Le dispositif “Précision de test” a été ajouté.'}
      ${blockingPoint} | ${'Le point de blocage “Précision de test” a été ajouté.'}
      ${evolution}     | ${'L’évolution “Précision de test” a été ajoutée.'}
    `(
      'should display the precision attached for $category',
      ({ category, expected }) => {
        renderComponentWithPrecisionAttached({
          category,
          label: 'Précision de test'
        });

        const description = screen.getByText(expected);
        expect(description).toBeVisible();
      }
    );
  });

  describe('housing:precision-detached', () => {
    function renderComponentWithPrecisionDetached(
      payload: Event<'housing:precision-detached'>['nextOld']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:precision-detached',
            creator: admin,
            nextOld: payload,
            nextNew: null
          })
        ],
        notes: []
      });
    }

    const mechanism = faker.helpers.arrayElement(
      PRECISION_MECHANISM_CATEGORY_VALUES
    );
    const blockingPoint = faker.helpers.arrayElement(
      PRECISION_BLOCKING_POINT_CATEGORY_VALUES
    );
    const evolution = faker.helpers.arrayElement(
      PRECISION_EVOLUTION_CATEGORY_VALUES
    );

    it.each`
      category         | label
      ${mechanism}     | ${'un dispositif'}
      ${blockingPoint} | ${'un point de blocage'}
      ${evolution}     | ${'une évolution'}
    `('should display a title for $category', ({ category, label }) => {
      renderComponentWithPrecisionDetached({
        category,
        label: 'Précision de test'
      });

      const title = screen.getByText(
        `L’équipe Zéro Logement Vacant a retiré ${label}`
      );
      expect(title).toBeVisible();
    });

    it.each`
      category         | expected
      ${mechanism}     | ${'Le dispositif “Précision de test” a été retiré.'}
      ${blockingPoint} | ${'Le point de blocage “Précision de test” a été retiré.'}
      ${evolution}     | ${'L’évolution “Précision de test” a été retirée.'}
    `(
      'should display the precision detached for $category',
      ({ category, expected }) => {
        renderComponentWithPrecisionDetached({
          category,
          label: 'Précision de test'
        });

        const description = screen.getByText(expected);
        expect(description).toBeVisible();
      }
    );
  });

  describe('housing:owner-attached', () => {
    function renderComponentWithOwnerAttached(rank: OwnerRank) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:owner-attached',
            creator: admin,
            nextOld: null,
            nextNew: { name: 'Jean Dupont', rank }
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithOwnerAttached(1);

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a ajouté un propriétaire'
      );
      expect(title).toBeVisible();
    });

    it('should display the owner attached as main owner', () => {
      renderComponentWithOwnerAttached(1);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” a été ajouté en tant que “Propriétaire principal”.'
      );
      expect(description).toBeVisible();
    });

    it('should display the owner attached as secondary owner', () => {
      renderComponentWithOwnerAttached(2);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” a été ajouté en tant que “Propriétaire secondaire”.'
      );
      expect(description).toBeVisible();
    });

    it('should display the owner attached as previous owner', () => {
      renderComponentWithOwnerAttached(0);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” a été ajouté en tant que “Ancien propriétaire”.'
      );
      expect(description).toBeVisible();
    });

    it('should display the owner attached as incorrect owner', () => {
      renderComponentWithOwnerAttached(-1);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” a été ajouté en tant que “Propriétaire incorrect”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:owner-detached', () => {
    function renderComponentWithOwnerDetached(rank: OwnerRank) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:owner-detached',
            creator: admin,
            nextOld: { name: 'Jean Dupont', rank },
            nextNew: null
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithOwnerDetached(1);

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a supprimé un propriétaire'
      );
      expect(title).toBeVisible();
    });

    it('should display the owner detached', () => {
      renderComponentWithOwnerDetached(1);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” a été supprimé.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:owner-updated', () => {
    function renderComponentWithOwnerUpdate(from: OwnerRank, to: OwnerRank) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:owner-updated',
            creator: admin,
            nextOld: { name: 'Jean Dupont', rank: from },
            nextNew: { name: 'Jean Dupont', rank: to }
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithOwnerUpdate(1, 2);

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a mis à jour le rang d’un propriétaire'
      );
      expect(title).toBeVisible();
    });

    it('should display the rank change from main to secondary owner', () => {
      renderComponentWithOwnerUpdate(1, 2);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” est passé de “Propriétaire principal” à “Propriétaire secondaire”.'
      );
      expect(description).toBeVisible();
    });

    it('should display the rank change from main to previous owner', () => {
      renderComponentWithOwnerUpdate(1, 0);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” est passé de “Propriétaire principal” à “Ancien propriétaire”.'
      );
      expect(description).toBeVisible();
    });

    it('should display the rank change from previous to incorrect owner', () => {
      renderComponentWithOwnerUpdate(1, -1);

      const description = screen.getByText(
        'Le propriétaire “Jean Dupont” est passé de “Propriétaire principal” à “Propriétaire incorrect”.'
      );
      expect(description).toBeVisible();
    });
  });
});

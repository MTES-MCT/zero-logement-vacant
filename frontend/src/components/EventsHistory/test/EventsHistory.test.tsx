import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Occupancy,
  type OwnerRank,
  PRECISION_BLOCKING_POINT_CATEGORY_VALUES,
  PRECISION_EVOLUTION_CATEGORY_VALUES,
  PRECISION_MECHANISM_CATEGORY_VALUES,
  UserRole
} from '@zerologementvacant/models';
import async from 'async';
import { Provider } from 'react-redux';

import { genEvent, genUser } from '../../../test/fixtures';
import type { Event } from '../../../models/Event';
import type { Note } from '../../../models/Note';
import type { User } from '../../../models/User';
import configureTestStore from '../../../utils/storeUtils';
import { HousingEditionProvider } from '../../HousingEdition/useHousingEdition';
import EventsHistory from '../EventsHistory';

interface RenderComponentProps {
  events: Event[];
  notes: Note[];
}

describe('EventsHistory', () => {
  const user = userEvent.setup();

  function renderComponent({ events, notes }: RenderComponentProps) {
    const store = configureTestStore();
    render(
      <HousingEditionProvider>
        <Provider store={store}>
          <EventsHistory events={events} notes={notes} />
        </Provider>
      </HousingEditionProvider>
    );
  }

  const admin: User = {
    ...genUser(),
    role: UserRole.ADMIN,
    email: 'admin@zerologementvacant.beta.gouv.fr',
    firstName: 'Zéro',
    lastName: 'Logement Vacant',
    establishmentId: null
  };

  it('should sort events by date and time descending', () => {
    renderComponent({
      events: [
        {
          ...genEvent({
            type: 'housing:created',
            creator: admin,
            nextOld: null,
            nextNew: { source: 'lovac-2019', occupancy: Occupancy.VACANT }
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
          createdAt: new Date('2020-01-02T12:00:00Z').toJSON()
        }
      ],
      notes: []
    });

    const firstTitle = screen.getByText(/a mis à jour le statut d’occupation/);
    const secondTitle = screen.getByText(/a importé ce logement/);
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
              nextNew: { source: 'lovac-2019', occupancy: Occupancy.VACANT }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          },
          {
            ...genEvent({
              type: 'housing:occupancy-updated',
              creator: admin,
              nextOld: { occupancy: 'Vacant' },
              nextNew: { occupancy: 'En location' }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          }
        ],
        notes: []
      });

      const title = screen.queryByText(/a mis à jour des informations/);
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020');
      expect(datetime).toBeVisible();
      const details = screen.getByRole('button', {
        name: 'Plus de détails'
      });
      await user.click(details);
      const description = screen.queryByText(
        /Le statut d’occupation est passé de “Vacant” à “En location”/
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
              nextNew: { source: 'lovac-2019', occupancy: 'Vacant' }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          }
        ],
        notes: []
      });
    });

    it('should display a title', () => {
      const title = screen.getByText(
        /L’équipe Zéro Logement Vacant a importé ce logement/
      );
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020 à 12:00');
      expect(datetime).toBeVisible();
    });

    it('should display a description', () => {
      const description = screen.getByText(
        'Le logement a été importé de la base de données LOVAC (2019).'
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
              nextOld: { occupancy: 'Vacant' },
              nextNew: { occupancy: 'En location' }
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
      const datetime = screen.getByText('le 01/01/2020 à 12:00');
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
    beforeEach(async () => {
      renderComponent({
        events: [
          {
            ...genEvent({
              type: 'housing:status-updated',
              creator: admin,
              nextOld: { status: 'Non suivi' },
              nextNew: {
                status: 'Premier contact',
                subStatus: 'Intervention en cours'
              }
            }),
            createdAt: new Date('2020-01-01T12:00:00Z').toJSON()
          }
        ],
        notes: []
      });

      const details = screen.getAllByRole('button', {
        name: 'Plus de détails'
      });
      await async.forEachSeries(details, async (detail) => {
        await user.click(detail);
      });
    });

    it('should display a title', () => {
      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a mis à jour le statut de suivi'
      );
      expect(title).toBeVisible();
      const datetime = screen.getByText('le 01/01/2020 à 12:00');
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

  describe('housing:group-attached', () => {
    function renderComponentWithGroupAttached(
      payload: Event<'housing:group-attached'>['nextNew']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:group-attached',
            creator: admin,
            nextOld: null,
            nextNew: payload
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithGroupAttached({ name: 'Groupe de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a ajouté ce logement dans un groupe'
      );
      expect(title).toBeVisible();
    });

    it('should display the group attached', () => {
      renderComponentWithGroupAttached({ name: 'Groupe de test' });

      const description = screen.getByText(
        'Ce logement a été ajouté au groupe “Groupe de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:group-detached', () => {
    function renderComponentWithGroupDetached(
      payload: Event<'housing:group-detached'>['nextOld']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:group-detached',
            creator: admin,
            nextOld: payload,
            nextNew: null
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithGroupDetached({ name: 'Groupe de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a retiré ce logement d’un groupe'
      );
      expect(title).toBeVisible();
    });

    it('should display the group detached', () => {
      renderComponentWithGroupDetached({ name: 'Groupe de test' });

      const description = screen.getByText(
        'Ce logement a été retiré du groupe “Groupe de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:group-archived', () => {
    function renderComponentWithGroupArchived(
      payload: Event<'housing:group-archived'>['nextOld']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:group-archived',
            creator: admin,
            nextOld: payload,
            nextNew: null
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithGroupArchived({ name: 'Groupe de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a archivé le groupe “Groupe de test” dans lequel le logement se trouvait'
      );
      expect(title).toBeVisible();
    });

    it('should display the group archived', () => {
      renderComponentWithGroupArchived({ name: 'Groupe de test' });

      const description = screen.getByText(
        'Ce logement a donc été retiré du groupe “Groupe de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:group-removed', () => {
    function renderComponentWithGroupRemoved(
      payload: Event<'housing:group-removed'>['nextOld']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:group-removed',
            creator: admin,
            nextOld: payload,
            nextNew: null
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithGroupRemoved({ name: 'Groupe de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a supprimé le groupe “Groupe de test” dans lequel le logement se trouvait'
      );
      expect(title).toBeVisible();
    });

    it('should display the group removed', () => {
      renderComponentWithGroupRemoved({ name: 'Groupe de test' });

      const description = screen.getByText(
        'Ce logement a donc été retiré du groupe “Groupe de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:campaign-attached', () => {
    function renderComponentWithCampaignAttached(
      payload: Event<'housing:campaign-attached'>['nextNew']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:campaign-attached',
            creator: admin,
            nextOld: null,
            nextNew: payload
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithCampaignAttached({ name: 'Campagne de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a ajouté ce logement dans une campagne'
      );
      expect(title).toBeVisible();
    });

    it('should display the campaign attached', () => {
      renderComponentWithCampaignAttached({ name: 'Campagne de test' });

      const description = screen.getByText(
        'Ce logement a été ajouté à la campagne “Campagne de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:campaign-detached', () => {
    function renderComponentWithCampaignDetached(
      payload: Event<'housing:campaign-detached'>['nextOld']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:campaign-detached',
            creator: admin,
            nextOld: payload,
            nextNew: null
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithCampaignDetached({ name: 'Campagne de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a retiré ce logement d’une campagne'
      );
      expect(title).toBeVisible();
    });

    it('should display the campaign detached', () => {
      renderComponentWithCampaignDetached({ name: 'Campagne de test' });

      const description = screen.getByText(
        'Ce logement a été retiré de la campagne “Campagne de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('housing:campaign-removed', () => {
    function renderComponentWithCampaignRemoved(
      payload: Event<'housing:campaign-removed'>['nextOld']
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'housing:campaign-removed',
            creator: admin,
            nextOld: payload,
            nextNew: null
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithCampaignRemoved({ name: 'Campagne de test' });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a supprimé la campagne “Campagne de test” dans laquelle le logement se trouvait'
      );
      expect(title).toBeVisible();
    });

    it('should display the campaign removed', () => {
      renderComponentWithCampaignRemoved({ name: 'Campagne de test' });

      const description = screen.getByText(
        'Ce logement a donc été retiré de la campagne “Campagne de test”.'
      );
      expect(description).toBeVisible();
    });
  });

  describe('owner:updated', () => {
    function renderComponentWithOwnerUpdated(
      payload: Pick<Event<'owner:updated'>, 'nextOld' | 'nextNew'>
    ) {
      renderComponent({
        events: [
          genEvent({
            type: 'owner:updated',
            creator: admin,
            nextOld: payload.nextOld,
            nextNew: payload.nextNew
          })
        ],
        notes: []
      });
    }

    it('should display a title', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Dupont', address: '1 rue de Paris' },
        nextNew: { name: 'Jean Dupont', address: '2 rue de Capbreton' }
      });

      const title = screen.getByText(
        'L’équipe Zéro Logement Vacant a mis à jour les informations d’un propriétaire'
      );
      expect(title).toBeVisible();
    });

    it('should display a name change', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Jean' },
        nextNew: { name: 'Pierre Truc' }
      });

      const description = screen.getByText(
        'Le nom et prénom du propriétaire “Pierre Truc” sont passés de “Jean Jean” à “Pierre Truc”.'
      );
      expect(description).toBeVisible();
    });

    it('should display a birthdate change', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Dupont', birthdate: '1980-01-01' },
        nextNew: { name: 'Jean Dupont', birthdate: '1990-01-01' }
      });

      const description = screen.getByText(
        'La date de naissance du propriétaire “Jean Dupont” est passée de “01/01/1980” à “01/01/1990”.'
      );
      expect(description).toBeVisible();
    });

    it('should display an email change', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Dupont', email: 'jean.dupont@test.test' },
        nextNew: { name: 'Jean Dupont', email: 'jean.dupont@beta.gouv.fr' }
      });

      const description = screen.getByText(
        'L’adresse e-mail du propriétaire “Jean Dupont” est passée de “jean.dupont@test.test” à “jean.dupont@beta.gouv.fr”.'
      );
      expect(description).toBeVisible();
    });

    it('should display a phone change', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Dupont', phone: '0102030405' },
        nextNew: { name: 'Jean Dupont', phone: '06.07.08.09.10' }
      });

      const description = screen.getByText(
        'Le numéro de téléphone du propriétaire “Jean Dupont” est passé de “0102030405” à “06.07.08.09.10”.'
      );
      expect(description).toBeVisible();
    });

    it('should display an address change', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Dupont', address: '1 rue de Paris' },
        nextNew: { name: 'Jean Dupont', address: '2 rue de Capbreton' }
      });

      const description = screen.getByText(
        'L’adresse postale du propriétaire “Jean Dupont” est passée de “1 rue de Paris” à “2 rue de Capbreton”.'
      );
      expect(description).toBeVisible();
    });

    it('should display an additional address change', () => {
      renderComponentWithOwnerUpdated({
        nextOld: { name: 'Jean Dupont', additionalAddress: 'Les Cabannes' },
        nextNew: { name: 'Jean Dupont', additionalAddress: 'Les Cabanons' }
      });

      const description = screen.getByText(
        'Le complément d’adresse du propriétaire “Jean Dupont” est passée de “Les Cabannes” à “Les Cabanons”.'
      );
      expect(description).toBeVisible();
    });
  });
});

import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  type DocumentDTO,
  type HousingDTO,
  type HousingOwnerDTO,
  HousingStatus,
  type NoteDTO,
  Occupancy,
  type OwnerDTO,
  type OwnerRank,
  type UserDTO,
  UserRole
} from '@zerologementvacant/models';
import {
  genDocumentDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genNoteDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import async from 'async';
import { format, subYears } from 'date-fns';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import data from '~/mocks/handlers/data';
import { fromUserDTO } from '~/models/User';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';
import HousingView from '~/views/Housing/HousingView';

describe('Housing view', () => {
  const user = userEvent.setup();

  interface RenderViewOptions {
    user?: UserDTO;
    owners?: ReadonlyArray<OwnerDTO>;
    housingOwners?: ReadonlyArray<HousingOwnerDTO>;
    notes?: ReadonlyArray<NoteDTO>;
    documents?: ReadonlyArray<DocumentDTO>;
    /**
     * @default true
     */
    createHousing?: boolean;
  }

  function renderView(housing: HousingDTO, options?: RenderViewOptions) {
    const createHousing = options?.createHousing ?? true;
    if (housing && createHousing) {
      data.housings.push(housing);
    }
    if (options?.owners) {
      data.owners.push(...options.owners);
    }
    if (options?.housingOwners) {
      data.housingOwners.set(housing.id, options.housingOwners);
    }
    if (options?.notes?.length) {
      data.notes.push(...options.notes);
      data.housingNotes.set(
        housing.id,
        options.notes.map((note) => note.id)
      );
    }
    if (options?.documents?.length) {
      options.documents.forEach((document) => {
        data.documents.set(document.id, document);
      });
      data.housingDocuments.set(housing.id, options.documents);
    }

    const user = options?.user ?? genUserDTO(UserRole.USUAL);
    const auth = genAuthUser(fromUserDTO(user));
    const store = configureTestStore({ auth });
    const router = createMemoryRouter(
      [{ path: '/housing/:housingId', element: <HousingView /> }],
      {
        initialEntries: [`/housing/${housing.id}`]
      }
    );
    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  it('should throw an error if the housing is missing', async () => {
    const owner = genOwnerDTO();
    const missingHousing = genHousingDTO(owner);

    renderView(missingHousing, {
      createHousing: false
    });

    const error = await screen.findByRole('heading', {
      name: 'Page non trouvée'
    });
    expect(error).toBeVisible();
  });

  it('should display the main owner', async () => {
    const owner = genOwnerDTO();
    const housing = genHousingDTO(owner);

    renderView(housing, {
      owners: [owner],
      housingOwners: [{ ...genHousingOwnerDTO(owner), rank: 1 as OwnerRank }]
    });

    const name = await screen.findByLabelText('Nom et prénom');
    expect(name).toHaveTextContent(new RegExp(owner.fullName, 'i'));
  });

  it('should allow users to modify owners', async () => {
    const housing = genHousingDTO(null);
    const owner = genOwnerDTO();
    const housingOwner: HousingOwnerDTO = {
      ...genHousingOwnerDTO(owner),
      rank: 1
    };
    const auth = genUserDTO(UserRole.USUAL);

    renderView(housing, {
      owners: [owner],
      housingOwners: [housingOwner],
      user: auth
    });

    const modify = await screen.findByTitle('Modifier les propriétaires');
    expect(modify).toBeVisible();
  });

  it('should hide the button to edit owners from visitors', async () => {
    const housing = genHousingDTO(null);
    const owner = genOwnerDTO();
    const housingOwner = genHousingOwnerDTO(owner);
    const auth = genUserDTO(UserRole.VISITOR);

    renderView(housing, {
      owners: [owner],
      housingOwners: [housingOwner],
      user: auth
    });

    const name = await screen.findByText(owner.fullName);
    expect(name).toBeVisible();
    const title = screen.queryByTitle('Modifier les propriétaires');
    expect(title).not.toBeInTheDocument();
  });

  describe('Show housing details', () => {
    describe('Vacancy start year', () => {
      it('should be unknown', async () => {
        const housing = genHousingDTO(null);
        housing.occupancy = Occupancy.RENT;
        housing.vacancyStartYear = null;

        renderView(housing);

        const vacancyStartYear = await screen.findByLabelText(
          'Année de début de vacance déclarée'
        );
        expect(vacancyStartYear).toHaveTextContent('Pas d’information');
      });

      it('should be defined', async () => {
        const housing = genHousingDTO(null);
        housing.occupancy = Occupancy.VACANT;
        housing.vacancyStartYear = new Date().getFullYear() - 1;

        renderView(housing);

        const vacancyStartYear = await screen
          .findByText(/^Année de début de vacance déclarée/)
          .then((label) => label.nextElementSibling);
        expect(vacancyStartYear).toHaveTextContent(
          `${format(subYears(new Date(), 1), 'yyyy')} (1 an)`
        );
      });
    });

    describe('Source', () => {
      it('should be "Fichiers fonciers (2023)"', async () => {
        const housing = genHousingDTO(null);
        housing.dataFileYears = ['ff-2023-locatif'];

        renderView(housing);

        const source = await screen.findByText(/^Source des informations/);
        expect(source).toHaveTextContent('Fichiers fonciers (2023)');
      });
    });
  });

  describe('Update the housing', () => {
    it.todo('should hide the edit button from visitors');

    it('should update the occupancy', async () => {
      const housing = genHousingDTO(null);
      housing.status = HousingStatus.NEVER_CONTACTED;
      housing.subStatus = null;
      housing.occupancy = Occupancy.VACANT;
      housing.occupancyIntended = null;

      renderView(housing);

      const update = await screen.findByRole('button', {
        name: /Éditer/,
        description: 'Mettre à jour le logement'
      });
      await user.click(update);
      const panel = await screen.findByRole('tabpanel', {
        name: 'Occupation'
      });
      const occupancy = await within(panel).findByLabelText(
        'Occupation actuelle'
      );
      await user.click(occupancy);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByRole('option', {
        name: 'En location'
      });
      await user.click(option);
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const newOccupancy = await screen.findByText(/Occupation :/);
      expect(newOccupancy).toHaveTextContent(/En location/i);
    });

    it('should update the status', async () => {
      const housing = genHousingDTO(null);
      housing.status = HousingStatus.NEVER_CONTACTED;
      housing.subStatus = null;
      housing.occupancy = Occupancy.VACANT;
      housing.occupancyIntended = null;

      renderView(housing);

      const [update] = await screen.findAllByRole('button', {
        name: /Éditer/
      });
      await user.click(update);
      const mobilizationTab = await screen.findByRole('tab', {
        name: 'Suivi'
      });
      await user.click(mobilizationTab);
      const mobilizationPanel = await screen.findByRole('tabpanel', {
        name: 'Suivi'
      });
      const status =
        await within(mobilizationPanel).findByLabelText(/Statut de suivi/);
      await user.click(status);
      const options = await screen.findByRole('listbox');
      const statusOption = await within(options).findByText(/Premier contact/i);
      await user.click(statusOption);
      const subStatus =
        await within(mobilizationPanel).findByLabelText(/Sous-statut/);
      await user.click(subStatus);
      const subStatusOption = await screen.findByRole('option', {
        name: 'En pré-accompagnement'
      });
      await user.click(subStatusOption);
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const mobilization = await screen.findByLabelText('Statut de suivi');
      expect(mobilization).toBeVisible();
    });

    it('should create a note', async () => {
      const housing = genHousingDTO(null);
      housing.status = HousingStatus.NEVER_CONTACTED;
      housing.subStatus = null;
      housing.occupancy = Occupancy.VACANT;
      housing.occupancyIntended = null;

      renderView(housing);

      const [update] = await screen.findAllByRole('button', {
        name: /Éditer/
      });
      await user.click(update);
      const noteTab = await screen.findByRole('tab', {
        name: 'Note'
      });
      await user.click(noteTab);
      const notePanel = await screen.findByRole('tabpanel', {
        name: 'Note'
      });
      const textbox = await within(notePanel).findByLabelText('Nouvelle note');
      await user.type(textbox, faker.lorem.paragraph());
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const history = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(history);
      const panel = await screen.findByRole('tabpanel', {
        name: 'Notes et historique'
      });
      const note = await within(panel).findByText('Note');
      expect(note).toBeVisible();
    });
  });

  describe('Add a note', () => {
    it('should add a note', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);

      renderView(housing, {
        user: auth,
        notes: []
      });

      const tab = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(tab);
      const createNote = await screen.findByRole('button', {
        name: 'Ajouter une note'
      });
      await user.click(createNote);
      const textarea = await screen.findByRole('textbox', {
        name: /Nouvelle note/
      });
      await user.type(textarea, 'Ceci est une note de test');
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const note = await screen.findByText('Ceci est une note de test');
      expect(note).toBeVisible();
    });
  });

  describe('Filter the event history', () => {
    it('should filter by event type', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const note = genNoteDTO(creator);

      renderView(housing, {
        notes: [note],
        user: creator
      });

      const tab = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(tab);
      const type = await screen.findByRole('combobox', {
        name: 'Type d’événement'
      });
      await user.click(type);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByRole('option', {
        name: 'Note'
      });
      await user.click(option);
      await user.keyboard('{Escape}');
      const notes = screen.queryAllByRole('region', {
        name: 'Note'
      });
      expect(notes.length).toBeGreaterThan(0);
      const events = screen.queryAllByRole('article', {
        name: 'Mise à jour'
      });
      expect(events).toHaveLength(0);
    });

    it('should filter by creator', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const note = genNoteDTO(creator);

      renderView(housing, {
        notes: [note],
        user: creator
      });

      const tab = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(tab);
      const author = await screen.findByRole('combobox', {
        name: 'Auteur'
      });
      await user.click(author);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByRole('option', {
        name: `${creator.firstName} ${creator.lastName}`
      });
      await user.click(option);
      await user.keyboard('{Escape}');
      const notes = await screen.findAllByRole('region', {
        name: 'Note'
      });
      notes.forEach((note) => {
        expect(
          within(note).queryByText(`${creator.firstName} ${creator.lastName}`)
        ).toBeInTheDocument();
      });
    });

    it('should filter by date', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const note = genNoteDTO(creator);
      note.createdAt = '2000-01-01T12:00:00Z';

      renderView(housing, {
        notes: [note],
        user: creator
      });

      const tab = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(tab);
      const panel = await screen.findByRole('tabpanel', {
        name: 'Notes et historique'
      });
      const input = await within(panel).findByLabelText('Date de création');
      await user.type(input, '01012020');
      const history = await screen.findAllByRole('region', {
        name: (name) => ['Note', 'Mise à jour'].includes(name)
      });
      history.forEach((eventOrNote) => {
        expect(eventOrNote).toHaveTextContent('le 01/01/2000');
      });
    });

    it('should reset filters', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const note = genNoteDTO(creator);

      renderView(housing, {
        notes: [note],
        user: creator
      });

      const tab = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(tab);
      let type = await screen.findByRole('combobox', {
        name: 'Type d’événement'
      });
      await user.click(type);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByRole('option', {
        name: 'Note'
      });
      await user.click(option);
      await user.keyboard('{Escape}');
      const reset = await screen.findByRole('button', {
        name: 'Réinitialiser les filtres'
      });
      await user.click(reset);
      type = await screen.findByRole('combobox', {
        name: 'Type d’événement'
      });
      expect(type).toHaveTextContent('Tous');
    });
  });

  describe('Edit a note', () => {
    it('should edit the note', async () => {
      const housing = genHousingDTO(null);
      const admin = genUserDTO(UserRole.ADMIN);
      const note = genNoteDTO(admin);

      renderView(housing, {
        notes: [note],
        user: admin
      });

      const history = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(history);
      const edit = await screen.findByRole('button', {
        name: 'Éditer la note'
      });
      await user.click(edit);
      const textarea = await screen.findByRole('textbox', {
        name: 'Contenu de la note'
      });
      await user.clear(textarea);
      await user.type(textarea, 'Contenu de la note modifié');
      const save = await screen.findByRole('button', {
        name: 'Enregistrer la note'
      });
      await user.click(save);
      const updatedNote = await screen.findByText('Contenu de la note modifié');
      expect(updatedNote).toBeVisible();
    });

    it('should be invisible to a non-admin user who is not the creator of the note', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const note = genNoteDTO(creator);
      const auth = genUserDTO(UserRole.USUAL);

      renderView(housing, {
        notes: [note],
        user: auth
      });

      const history = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(history);

      expect(
        screen.queryByRole('button', { name: 'Éditer la note' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Remove a note', () => {
    it.todo('should be invisible to a visitor');

    it.todo('should be invisible to a common user who did not create the note');

    it('should allow the creator to remove their note', async () => {
      const creator = genUserDTO(UserRole.USUAL);
      const housing = genHousingDTO(null);
      const note = genNoteDTO(creator);

      renderView(housing, {
        notes: [note],
        user: creator
      });

      const history = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(history);
      const remove = await screen.findByRole('button', {
        name: 'Supprimer la note'
      });
      await user.click(remove);
      const modal = await screen.findByRole('dialog', {
        name: 'Suppression d’une note'
      });
      const confirm = await within(modal).findByRole('button', {
        name: 'Confirmer'
      });
      await user.click(confirm);
      expect(screen.queryByText(note.content)).not.toBeInTheDocument();
    });

    it.todo('should allow an admin to remove any note');
  });

  describe('View documents', () => {
    it('should display a message if there is no document', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);

      renderView(housing, {
        documents: [],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const description = await within(tabpanel).findByText(
        /Il n’y a pas de document associé à ce logement/i
      );
      expect(description).toBeVisible();
    });

    it('should display documents', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const documents = faker.helpers.multiple(() => genDocumentDTO(auth));

      renderView(housing, {
        documents,
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      await async.forEach(documents, async (document) => {
        const name = await within(tabpanel).findByText(
          new RegExp(document.filename, 'i')
        );
        expect(name).toBeVisible();
      });
    });
  });

  describe('Rename a document', () => {
    it('should rename a document', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(auth);

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const renameButton = await screen.findByRole('button', {
        name: 'Renommer'
      });
      await user.click(renameButton);
      const modal = await screen.findByRole('dialog', {
        name: 'Renommer le document'
      });
      const input = await within(modal).findByRole('textbox', {
        name: /^Nouveau nom du document/
      });
      await user.clear(input);
      await user.type(input, 'nouveau-nom-document.pdf');
      const save = await within(modal).findByRole('button', {
        name: 'Confirmer'
      });
      await user.click(save);
      const renamedDocument = await within(tabpanel).findByText(
        'nouveau-nom-document.pdf'
      );
      expect(renamedDocument).toBeVisible();
    });

    it('should be invisible to a visitor', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(creator);
      const visitor = genUserDTO(UserRole.VISITOR);

      renderView(housing, {
        documents: [document],
        user: visitor
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const name = await within(tabpanel).findByText(
        new RegExp(document.filename, 'i')
      );
      expect(name).toBeVisible();

      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);

      expect(
        screen.queryByRole('button', { name: 'Renommer' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Delete a document', () => {
    it('should delete a document', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(auth);

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const deleteButton = await screen.findByRole('button', {
        name: 'Supprimer'
      });
      await user.click(deleteButton);
      const modal = await screen.findByRole('dialog', {
        name: 'Suppression du document'
      });
      const confirm = await within(modal).findByRole('button', {
        name: 'Confirmer'
      });
      await user.click(confirm);

      expect(
        within(tabpanel).queryByText(new RegExp(document.filename, 'i'))
      ).not.toBeInTheDocument();
    });

    it('should be invisible to a visitor', async () => {
      const housing = genHousingDTO(null);
      const creator = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(creator);
      const visitor = genUserDTO(UserRole.VISITOR);

      renderView(housing, {
        documents: [document],
        user: visitor
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const name = await within(tabpanel).findByText(
        new RegExp(document.filename, 'i')
      );
      expect(name).toBeVisible();

      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);

      expect(
        screen.queryByRole('button', { name: 'Supprimer' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Visualize documents in fullscreen', () => {
    it('should open fullscreen preview when clicking visualize', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(auth);

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const visualizeButton = await screen.findByRole('button', {
        name: 'Visualiser'
      });
      await user.click(visualizeButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeVisible();
    });

    it('should cycle through multiple documents in fullscreen', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const documents = [
        genDocumentDTO(auth),
        genDocumentDTO(auth),
        genDocumentDTO(auth)
      ];

      renderView(housing, {
        documents,
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);

      // Open fullscreen for first document
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdowns = await within(tabpanel).findAllByRole('button', {
        name: 'Options'
      });
      await user.click(dropdowns[0]);
      const visualizeButton = await screen.findByRole('button', {
        name: 'Visualiser'
      });
      await user.click(visualizeButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeVisible();
      const index = await within(modal).findByText(`1 / ${documents.length}`);
      expect(index).toBeVisible();

      // Navigate to previous document
      const previousButton = await screen.findByRole('button', {
        name: 'Document précédent'
      });
      await user.click(previousButton);
      const indexAfterPrevious = await within(modal).findByText(
        `${documents.length} / ${documents.length}`
      );
      expect(indexAfterPrevious).toBeVisible();

      // Navigate to next document
      const nextButton = await screen.findByRole('button', {
        name: 'Document suivant'
      });
      await user.click(nextButton);
      const indexAfterNext = await within(modal).findByText(
        `1 / ${documents.length}`
      );
      expect(indexAfterNext).toBeVisible();

      expect(modal).toBeVisible();
    });

    it('should close fullscreen preview with close button', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(auth);

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const visualizeButton = await screen.findByRole('button', {
        name: 'Visualiser'
      });
      await user.click(visualizeButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeVisible();

      // Close by clicking the close button
      const closeButton = await within(modal).findByRole('button', {
        name: 'Fermer'
      });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close fullscreen preview', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(auth);

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const visualizeButton = await screen.findByRole('button', {
        name: 'Visualiser'
      });
      await user.click(visualizeButton);

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeVisible();

      // Close by pressing Escape
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Download documents', () => {
    it('should show download button in dropdown', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      const document = genDocumentDTO(auth);

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const downloadButton = await screen.findByRole('button', {
        name: 'Télécharger'
      });

      expect(downloadButton).toBeVisible();
    });

    it('should show download button in fullscreen preview for unsupported file types', async () => {
      const housing = genHousingDTO(null);
      const auth = genUserDTO(UserRole.USUAL);
      // Create a document with an unsupported type (not image or PDF)
      const document: DocumentDTO = {
        ...genDocumentDTO(auth),
        contentType: 'application/vnd.ms-excel',
        filename: 'document.xls'
      };

      renderView(housing, {
        documents: [document],
        user: auth
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);
      const tabpanel = await screen.findByRole('tabpanel', {
        name: 'Documents'
      });
      const dropdown = await within(tabpanel).findByRole('button', {
        name: 'Options'
      });
      await user.click(dropdown);
      const visualizeButton = await screen.findByRole('button', {
        name: 'Visualiser'
      });
      await user.click(visualizeButton);

      const modal = await screen.findByRole('dialog');
      const downloadInModal = await within(modal).findByRole('button', {
        name: /télécharger/i
      });

      expect(downloadInModal).toBeVisible();
    });
  });

  describe('Upload documents', () => {
    it('should hide the upload input from visitors', async () => {
      const housing = genHousingDTO(null);
      const visitor = genUserDTO(UserRole.VISITOR);

      renderView(housing, {
        documents: [],
        user: visitor
      });

      const tab = await screen.findByRole('tab', {
        name: 'Documents'
      });
      await user.click(tab);

      const input = screen.queryByLabelText(
        /associez un ou plusieurs documents à ce logement/i
      );
      expect(input).not.toBeInTheDocument();
    });
  });
});

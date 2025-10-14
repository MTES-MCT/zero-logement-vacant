import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  type HousingDTO,
  type HousingOwnerDTO,
  HousingStatus,
  Occupancy,
  type OwnerDTO,
  type OwnerRank,
  UserRole
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genHousingOwnerDTO,
  genNoteDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { format, subYears } from 'date-fns';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { genAuthUser, genNote, genUser } from '../../../../test/fixtures';
import data from '../../../mocks/handlers/data';
import { type Note, toNoteDTO } from '../../../models/Note';
import { fromUserDTO, type User } from '../../../models/User';
import configureTestStore from '../../../utils/test/storeUtils';
import HousingView from '../HousingView';

describe('Housing view', () => {
  const user = userEvent.setup();

  let owner: OwnerDTO;
  let housing: HousingDTO;
  let housingOwners: HousingOwnerDTO[];

  beforeEach(() => {
    owner = genOwnerDTO();
    const secondaryOwners = Array.from({ length: 3 }, genOwnerDTO);
    data.owners.push(owner, ...secondaryOwners);
    housing = {
      ...genHousingDTO(owner),
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null,
      occupancy: Occupancy.VACANT,
      occupancyIntended: null
    };
    data.housings.push(housing);
    housingOwners = [owner, ...secondaryOwners].map((owner, i) => ({
      ...genHousingOwnerDTO(owner),
      rank: (i + 1) as OwnerRank
    }));
    data.housingOwners.set(housing.id, housingOwners);
  });

  interface RenderViewOptions {
    user?: User;
    notes?: ReadonlyArray<Note>;
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
    if (options?.notes?.length) {
      data.notes.push(...options.notes.map(toNoteDTO));
      data.housingNotes.set(
        housing.id,
        options.notes.map((note) => note.id)
      );
    }

    const store = configureTestStore({
      auth: genAuthUser(options?.user ?? genUser(UserRole.USUAL))
    });
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
    renderView(housing);

    const name = await screen.findByLabelText('Nom et prénom');
    expect(name).toHaveTextContent(owner.fullName);
  });

  describe('Show housing details', () => {
    describe('Vacancy start year', () => {
      it('should be unknown', async () => {
        housing.occupancy = Occupancy.RENT;
        housing.vacancyStartYear = null;

        renderView(housing);

        const vacancyStartYear = await screen.findByLabelText(
          'Année de début de vacance déclarée'
        );
        expect(vacancyStartYear).toHaveTextContent('Pas d’information');
      });

      it('should be defined', async () => {
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
        housing.dataFileYears = ['ff-2023-locatif'];

        renderView(housing);

        const source = await screen.findByText(/^Source des informations/);
        expect(source).toHaveTextContent('Fichiers fonciers (2023)');
      });
    });
  });

  describe('Update owner details', () => {
    it('should update their name', async () => {
      renderView(housing);

      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const accordions = await within(modal).findAllByRole('button', {
        expanded: false
      });
      const [firstAccordion] = accordions;
      await user.click(firstAccordion);
      const inputs = await within(modal).findAllByLabelText(/^Nom et prénom/);
      const [input] = inputs;
      const newName = faker.person.fullName();
      await user.clear(input);
      await user.type(input, newName);
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);

      expect(modal).not.toBeVisible();
      const name = await screen.findByLabelText('Nom et prénom');
      expect(name).toHaveTextContent(newName);
    });

    it('should update their birth date', async () => {
      owner.birthDate = null;

      renderView(housing);

      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const accordions = await within(modal).findAllByRole('button', {
        expanded: false
      });
      const [firstAccordion] = accordions;
      await user.click(firstAccordion);
      const inputs =
        await within(modal).findAllByLabelText(/^Date de naissance/);
      const [input] = inputs;
      const value = faker.date
        .birthdate()
        .toJSON()
        .substring(0, 'yyyy-mm-dd'.length);
      await user.clear(input);
      await user.type(input, value);
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);

      expect(modal).not.toBeVisible();
      const birthdate = await screen.findByLabelText('Date de naissance', {
        selector: 'span'
      });
      const regexp = new RegExp(`^${value.split('-').toReversed().join('/')}`);
      expect(birthdate).toHaveTextContent(regexp);
    });
  });

  describe('Add owner', () => {
    describe('If there is no main owner', () => {
      it('should add an owner', async () => {
        const housing: HousingDTO = genHousingDTO(null);

        renderView(housing);

        const add = await screen.findByRole('button', {
          name: /^Ajouter un propriétaire/
        });
        await user.click(add);
        // TODO
      });
    });

    it('should add an owner who is missing from the database', async () => {
      renderView(housing);

      const newOwner = genOwnerDTO();
      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const addOwner = await within(modal).findByRole('button', {
        name: /^Ajouter un propriétaire/
      });
      await user.click(addOwner);
      const rank = await within(modal).findByLabelText(
        /^Sélectionner les droits de propriétés/
      );
      await user.selectOptions(rank, String(housingOwners.length + 1));
      const identity = await within(modal).findByLabelText(/^Nom et prénom/);
      await user.type(identity, newOwner.fullName);
      const birthDate =
        await within(modal).findByLabelText(/^Date de naissance/);
      await user.type(birthDate, newOwner.birthDate as string);
      const address = await within(modal).findByLabelText(/^Adresse postale/);
      if (newOwner.rawAddress) {
        await user.type(address, newOwner.rawAddress.join(' '));
      }
      const email = await within(modal).findByLabelText(/^Adresse mail/);
      await user.type(email, newOwner.email as string);
      const phone = await within(modal).findByLabelText(/^Numéro de téléphone/);
      await user.type(phone, newOwner.phone as string);
      const add = await within(modal).findByRole('button', {
        name: /^Ajouter/
      });
      await user.click(add);
      const newAccordion = await within(modal).findByRole('button', {
        name: new RegExp(`^${newOwner.fullName}`)
      });
      expect(newAccordion).toBeVisible();
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);
      expect(modal).not.toBeVisible();
      const link = await screen.findByRole('heading', {
        name: newOwner.fullName
      });
      expect(link).toBeVisible();
    });

    it('should add an owner who is present in the database', async () => {
      const newOwner = genOwnerDTO();
      data.owners.push(newOwner);

      renderView(housing);

      const modifyOwners = await screen.findByRole('button', {
        name: /^Modifier/,
        description: 'Modifier le propriétaire'
      });
      await user.click(modifyOwners);
      const modal = await screen.findByRole('dialog');
      const addOwner = await within(modal).findByRole('button', {
        name: /^Ajouter un propriétaire/
      });
      await user.click(addOwner);
      const rank = await within(modal).findByLabelText(
        /^Sélectionner les droits de propriétés/
      );
      await user.selectOptions(rank, String(housingOwners.length + 1));
      const search = await within(modal).findByRole('searchbox');
      await user.type(search, newOwner.fullName + '{Enter}');
      await within(modal).findByText(/^Un propriétaire trouvé/);
      const cell = await within(modal).findByRole('cell');
      const add = await within(cell).findByRole('button', {
        name: /^Ajouter/
      });
      await user.click(add);
      const newAccordion = await within(modal).findByRole('button', {
        name: new RegExp(`^${newOwner.fullName}`)
      });
      expect(newAccordion).toBeVisible();
      const save = await within(modal).findByRole('button', {
        name: /^Enregistrer/
      });
      await user.click(save);
      expect(modal).not.toBeVisible();
      const link = await screen.findByRole('heading', {
        name: newOwner.fullName
      });
      expect(link).toBeVisible();
    });
  });

  describe('Update the housing', () => {
    it('should update the occupancy', async () => {
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
      renderView(housing);

      const [update] = await screen.findAllByRole('button', {
        name: /Mettre à jour/
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
      renderView(housing);

      const [update] = await screen.findAllByRole('button', {
        name: /Mettre à jour/
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
      renderView(housing, {
        user: genUser(UserRole.USUAL),
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
      renderView(housing, {
        notes: [genNote(genUser())],
        user: genUser()
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
      const creator = genUser();
      renderView(housing, {
        notes: [genNote(creator)],
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
      const creator = genUser();
      const note: Note = {
        ...genNote(creator),
        createdAt: '2000-01-01T12:00:00Z'
      };
      renderView(housing, {
        notes: [note],
        user: creator
      });

      const tab = await screen.findByRole('tab', {
        name: 'Notes et historique'
      });
      await user.click(tab);
      const input = await screen.findByLabelText('Date de création');
      await user.type(input, '01012020');
      const history = await screen.findAllByRole('region', {
        name: (name) => ['Note', 'Mise à jour'].includes(name)
      });
      history.forEach((eventOrNote) => {
        expect(eventOrNote).toHaveTextContent('le 01/01/2000');
      });
    });

    it('should reset filters', async () => {
      renderView(housing, {
        notes: [genNote(genUser())],
        user: genUser()
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
    const admin = genUserDTO(UserRole.ADMIN);
    const note = genNoteDTO(admin);

    beforeEach(() => {
      data.users.push(admin);
      data.notes.push(note);
      data.housingNotes.set(
        housing.id,
        data.housingNotes
          .get(housing.id)
          ?.filter((housingNote) => housingNote !== note.id)
          ?.concat(note.id) ?? [note.id]
      );
    });

    it('should edit the note', async () => {
      renderView(housing, {
        user: fromUserDTO(admin)
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
      const nonAdminUser = genUserDTO(UserRole.USUAL);
      data.users.push(nonAdminUser);
      const note = genNoteDTO(nonAdminUser);
      data.notes.push(note);
      data.housingNotes.set(
        housing.id,
        data.housingNotes
          .get(housing.id)
          ?.filter((housingNote) => housingNote !== note.id)
          ?.concat(note.id) ?? [note.id]
      );

      renderView(housing, {
        user: fromUserDTO(genUserDTO(UserRole.USUAL))
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
    function renderViewAs(role: UserRole) {
      const user = genUserDTO(role);
      const note = genNoteDTO(user);
      data.users.push(user);
      data.notes.push(note);
      data.housingNotes.set(housing.id, [note.id]);

      renderView(housing, {
        user: fromUserDTO(user)
      });

      return {
        note,
        user
      };
    }

    it('should remove the note', async () => {
      const { note } = renderViewAs(UserRole.ADMIN);

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
  });
});

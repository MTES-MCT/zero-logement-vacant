import { faker } from '@faker-js/faker/locale/fr';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ACTIVE_OWNER_RANKS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VALUES,
  type CampaignDTO,
  type CampaignStatus,
  type DatafoncierHousing,
  type EstablishmentDTO,
  type GroupDTO,
  HOUSING_KIND_VALUES,
  type HousingDTO,
  HousingKind,
  type HousingOwnerDTO,
  HousingStatus,
  isPrimaryOwner,
  type OwnerDTO,
  type OwnerRank,
  type UserDTO,
  UserRole
} from '@zerologementvacant/models';
import {
  genBuildingDTO,
  genCampaignDTO,
  genDatafoncierHousing,
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genHousingOwnerDTO,
  genIdprocpte,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import async from 'async';
import { Array, pipe, Predicate } from 'effect';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';

import data from '../../mocks/handlers/data';
import configureTestStore from '../../utils/storeUtils';
import CampaignView from '../Campaign/CampaignView';
import HousingListTabsProvider from './HousingListTabsProvider';
import HousingListView from './HousingListView';
import { genAuthUser } from '~/test/fixtures';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';

vi.mock('../../components/Aside/Aside.tsx');

interface RenderViewOptions {
  auth: UserDTO;
  establishment: EstablishmentDTO;
  housings: ReadonlyArray<HousingDTO>;
  owners: ReadonlyArray<OwnerDTO>;
  housingOwners: ReadonlyArray<
    HousingOwnerDTO & { housingId: string; ownerId: string }
  >;
  groups: ReadonlyArray<GroupDTO>;
  campaigns: ReadonlyArray<CampaignDTO>;
  campaignHousings: ReadonlyArray<{
    campaign: CampaignDTO;
    housings: ReadonlyArray<HousingDTO>;
  }>;
}

describe('Housing list view', () => {
  const user = userEvent.setup();

  function renderView(options: RenderViewOptions) {
    data.establishments.push(options.establishment);
    data.users.push(options.auth);
    data.groups.push(...options.groups);
    data.housings.push(...options.housings);
    data.owners.push(...options.owners);
    options.housingOwners.forEach((housingOwner) => {
      const existingHousingOwners =
        data.housingOwners.get(housingOwner.housingId) ?? [];
      data.housingOwners.set(housingOwner.housingId, [
        ...existingHousingOwners,
        housingOwner
      ]);
    });
    data.campaigns.push(...options.campaigns);
    options.campaignHousings.forEach(({ campaign, housings }) => {
      data.campaignHousings.set(campaign.id, housings);
      housings.forEach((housing) => {
        const existingCampaigns = data.housingCampaigns.get(housing.id) ?? [];
        data.housingCampaigns.set(housing.id, [...existingCampaigns, campaign]);
      });
    });

    const store = configureTestStore({
      auth: genAuthUser(
        fromUserDTO(options.auth),
        fromEstablishmentDTO(options.establishment)
      )
    });
    const router = createMemoryRouter(
      [
        {
          path: '/logements/:id',
          element: 'Logement'
        },
        {
          path: '/groupes/:id',
          element: 'Groupe'
        },
        { path: '/campagnes/:id', element: <CampaignView /> },
        {
          path: '/',
          element: (
            <HousingListTabsProvider>
              <HousingListView />
            </HousingListTabsProvider>
          )
        }
      ],
      {
        initialEntries: ['/']
      }
    );

    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );

    return { router };
  }

  it('should filter by housing kind', async () => {
    const establishment = genEstablishmentDTO();
    const auth = genUserDTO(UserRole.USUAL, establishment);
    const housings = HOUSING_KIND_VALUES.flatMap((housingKind) => {
      return faker.helpers
        .multiple(() => genHousingDTO())
        .map((housing) => ({ ...housing, housingKind }));
    });
    const owners = faker.helpers.multiple(() => genOwnerDTO(), {
      count: housings.length
    });
    const housingOwners = housings.map((housing, i) => {
      const owner = owners[i];
      return {
        ...genHousingOwnerDTO(owner),
        rank: 1 as const,
        housingId: housing.id,
        ownerId: owner.id
      };
    });

    renderView({
      establishment,
      auth,
      housings,
      owners,
      housingOwners,
      groups: [],
      campaigns: [],
      campaignHousings: []
    });

    const accordion = await screen.findByRole('button', { name: /^Logement/ });
    await user.click(accordion);
    const status = await screen.findByRole('combobox', {
      name: /Type de logement/
    });
    await user.click(status);
    const options = await screen.findByRole('listbox');
    const option = await within(options).findByText('Appartement');
    await user.click(option);
    const filteredHousings = housings.filter(
      (housing) => housing.housingKind === HousingKind.APARTMENT
    );
    const label = await screen.findByText(
      `${filteredHousings.length} logements (${filteredHousings.length} propriétaires) filtrés sur un total de ${housings.length} logements`
    );
    expect(label).toBeVisible();
  });

  describe('Select housings', () => {
    it('should select all housings when the top checkbox gets checked', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const [row] = await screen.findAllByRole('columnheader');
      const checkboxes = await within(row).findAllByRole('checkbox');
      const [checkAll] = checkboxes;
      await user.click(checkAll);
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should unselect all housings when the top checkbox is checked and clicked again', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const [row] = await screen.findAllByRole('row');
      const checkboxes = await within(row).findAllByRole('checkbox');
      const [checkAll] = checkboxes;
      await user.click(checkAll);
      await user.click(checkAll);
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('Add a housing', () => {
    let datafoncierHousing: DatafoncierHousing;

    beforeEach(() => {
      const idprocpte = genIdprocpte();
      const building = genBuildingDTO();
      datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      data.datafoncierHousings.push(datafoncierHousing);
    });

    it('should fail if the housing was not found in datafoncier', async () => {
      const localId = faker.string.alphanumeric(12);
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);

      renderView({
        establishment,
        auth,
        housings: [],
        owners: [],
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const button = await screen.findByRole('button', {
        name: /^Ajouter un logement/
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog');
      const input = await within(modal).findByLabelText(
        /^Saisissez l’identifiant fiscal national/
      );
      await user.type(input, localId);
      await user.click(within(modal).getByRole('button', { name: /^Suivant/ }));
      const error = await within(modal).findByText(
        'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies. Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du logement. Le format de l’identifiant national n’est pas valide. Exemple de format valide : 331234567891'
      );
      expect(error).toBeVisible();
    });

    it('should fail if the housing already exists in our database', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owner = genOwnerDTO();
      const housing: HousingDTO = {
        ...genHousingDTO(),
        localId: datafoncierHousing.idlocal
      };
      expect(housing.localId).toBeDefined();

      renderView({
        establishment,
        auth,
        housings: [housing],
        owners: [owner],
        housingOwners: [
          {
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: 1
          }
        ],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const button = screen.getByText('Ajouter un logement', {
        selector: 'button'
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog', {
        name: /^Ajouter un logement/
      });
      screen.debug(modal);
      const input = await within(modal).findByRole('textbox', {
        name: /^Saisissez l’identifiant fiscal national/
      });
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByText('Suivant'));
      const alert = await within(modal).findByText(
        'Ce logement existe déjà dans votre parc'
      );
      expect(alert).toBeVisible();
    });

    it('should succeed otherwise', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);

      const { router } = renderView({
        establishment,
        auth,
        housings: [],
        owners: [],
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const button = await screen.findByRole('button', {
        name: /^Ajouter un logement/
      });
      await user.click(button);
      const modal = await screen.findByRole('dialog', {
        name: /^Ajouter un logement/
      });
      const input = await within(modal).findByLabelText(
        /^Saisissez l’identifiant fiscal national/
      );
      await user.type(input, datafoncierHousing.idlocal);
      await user.click(within(modal).getByRole('button', { name: /^Suivant/ }));
      await screen.findByRole('heading', {
        name: 'Voici le logement que nous avons trouvé à cette adresse/sur cette parcelle.'
      });
      await user.click(screen.getByRole('button', { name: /^Confirmer/ }));

      expect(modal).not.toBeVisible();
      expect(router.state.location.pathname).toStartWith('/logements/');
    });
  });

  describe('Upload documents for a single housing', () => {
    it('should upload a single document', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const housing = genHousingDTO();

      renderView({
        establishment,
        auth,
        housings: [housing],
        owners: [],
        housingOwners: [],
        campaigns: [],
        campaignHousings: [],
        groups: []
      });

      const housingPanel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [editHousing] = await within(housingPanel).findAllByRole('button', {
        name: /^Éditer le logement/i
      });
      await user.click(editHousing);
      const documentTab = await screen.findByRole('tab', {
        name: /Documents/
      });
      await user.click(documentTab);
      const documentPanel = await screen.findByRole('tabpanel', {
        name: /Documents/
      });
      const input = await within(documentPanel).findByLabelText(
        /associez un ou plusieurs documents à ces logements/i
      );
      const file = new File(['dummy content'], 'example.pdf', {
        type: 'application/pdf'
      });
      await user.upload(input, file);
      const document = await within(documentPanel).findByText('example.pdf');
      expect(document).toBeVisible();
    });

    it('should remove documents on cancel', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const housing = genHousingDTO();

      renderView({
        establishment,
        auth,
        housings: [housing],
        owners: [],
        housingOwners: [],
        campaigns: [],
        campaignHousings: [],
        groups: []
      });

      const housingPanel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [editHousing] = await within(housingPanel).findAllByRole('button', {
        name: /^Éditer le logement/i
      });
      await user.click(editHousing);
      const documentTab = await screen.findByRole('tab', {
        name: /Documents/
      });
      await user.click(documentTab);
      const documentPanel = await screen.findByRole('tabpanel', {
        name: /Documents/
      });
      const input = await within(documentPanel).findByLabelText(
        /associez un ou plusieurs documents à ces logements/i
      );
      const file = new File(['dummy content'], 'example.pdf', {
        type: 'application/pdf'
      });
      await user.upload(input, file);
      const cancel = await screen.findByRole('button', { name: 'Annuler' });
      await user.click(cancel);
      const [editHousingAgain] = await within(housingPanel).findAllByRole(
        'button',
        { name: /^Éditer le logement/i }
      );
      await user.click(editHousingAgain);
      const documentTabAgain = await screen.findByRole('tab', {
        name: /Documents/
      });
      await user.click(documentTabAgain);
      const documentPanelAgain = await screen.findByRole('tabpanel', {
        name: /Documents/
      });
      const document = within(documentPanelAgain).queryByText('example.pdf');
      expect(document).not.toBeInTheDocument();
    });
  });

  describe('Upload documents for several housings', () => {
    it('should upload documents', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const housings = faker.helpers.multiple(() => genHousingDTO(null), {
        count: 3
      });

      renderView({
        establishment,
        auth,
        housings,
        owners: [],
        housingOwners: [],
        campaigns: [],
        campaignHousings: [],
        groups: []
      });

      const housingPanel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const checkboxes = await within(housingPanel)
        .findAllByRole('checkbox', {
          name: /^Sélectionner le logement/
        })
        .then((checkboxes) => checkboxes.slice(0, 2));
      await async.forEachSeries(checkboxes, async (checkbox) => {
        await user.click(checkbox);
      });
      const editHousings = await screen.findByRole('button', {
        name: 'Édition groupée'
      });
      await user.click(editHousings);
      const documentTab = await screen.findByRole('tab', {
        name: /Documents/
      });
      await user.click(documentTab);
      const documentPanel = await screen.findByRole('tabpanel', {
        name: /Documents/
      });
      const input = await within(documentPanel).findByLabelText(
        /associez un ou plusieurs documents à ces logements/i
      );
      const file = new File(['dummy content'], 'example.pdf', {
        type: 'application/pdf'
      });
      await user.upload(input, file);
      const submit = await screen.findByRole('button', { name: 'Enregistrer' });
      await user.click(submit);
      await async.forEachSeries(housings, async (housing) => {
        const edit = await screen.findByRole('button', {
          name: new RegExp(
            `Éditer le logement "${housing.rawAddress.join(', ')}"`,
            'i'
          )
        });
        await user.click(edit);
        const documentTabAgain = await screen.findByRole('tab', {
          name: /Documents/
        });
        await user.click(documentTabAgain);
        const documentPanelAgain = await screen.findByRole('tabpanel', {
          name: /Documents/
        });
        const document =
          await within(documentPanelAgain).findByText('example.pdf');
        expect(document).toBeVisible();
        const cancel = await screen.findByRole('button', { name: 'Annuler' });
        await user.click(cancel);
      });
    });
  });

  describe('Update several housings', () => {
    it('should update occupancies', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });
      const group = genGroupDTO(auth);

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [group],
        campaigns: [],
        campaignHousings: []
      });

      const housingTable = await screen.findByRole('table');
      const [checkbox] = await within(housingTable).findAllByRole('checkbox');
      await user.click(checkbox);
      const updateMany = await screen.findByRole('button', {
        name: 'Édition groupée'
      });
      await user.click(updateMany);
      const select = await screen.findByRole('combobox', {
        name: 'Occupation actuelle'
      });
      await user.click(select);
      const options = await screen.findByRole('listbox');
      const option = await within(options).findByText('Vacant');
      await user.click(option);
      const save = await screen.findByRole('button', {
        name: 'Enregistrer'
      });
      await user.click(save);
      const modal = await screen.findByRole('dialog', {
        name: /Vous êtes sur le point d’éditer \d+ logements/
      });
      expect(modal).toBeVisible();
      const confirm = await within(modal).findByRole('button', {
        name: 'Confirmer'
      });
      await user.click(confirm);

      const alert = await screen.findByRole('heading', {
        name: /L’édition groupée de \d+ logements a bien été enregistrée/
      });
      expect(alert).toBeVisible();
    });
  });

  describe('Group creation', () => {
    it('should add housings to an existing group', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });
      const group = genGroupDTO(auth);

      const { router } = renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [group],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const exportOrContactModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      expect(exportOrContactModal).toBeVisible();
      const addToGroup = await within(exportOrContactModal).findByRole(
        'button',
        { name: 'Ajouter dans un groupe' }
      );
      await user.click(addToGroup);
      const groupModal = await screen.findByRole('dialog', {
        name: 'Ajouter dans un groupe de logements'
      });
      expect(groupModal).toBeVisible();
      const select = await within(groupModal).findByRole('combobox', {
        name: /Ajoutez votre sélection à un groupe existant/
      });
      await user.selectOptions(select, group.id);
      const option: HTMLOptionElement = await screen.findByRole('option', {
        name: group.title
      });
      expect(option.selected).toBe(true);
      const confirm = await within(groupModal).findByRole('button', {
        name: /^Confirmer/
      });
      await user.click(confirm);
      expect(router.state.location.pathname).toStartWith('/groupes/');
    });

    it.todo('should add housings to a new group');

    it('should go back to the first step', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });
      const group = genGroupDTO(auth);

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [group],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const addToGroup = await screen.findByRole('button', {
        name: 'Ajouter dans un groupe'
      });
      await user.click(addToGroup);
      const back = await screen.findByRole('button', {
        name: 'Retour'
      });
      await user.click(back);
      const modal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      expect(modal).toBeVisible();
    });

    it('should go back to the previous step', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });
      const group = genGroupDTO(auth);

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [group],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const addToGroup = await screen.findByRole('button', {
        name: 'Ajouter dans un groupe'
      });
      await user.click(addToGroup);
      const newGroup = await screen.findByRole('button', {
        name: 'Créer un nouveau groupe'
      });
      await user.click(newGroup);
      const back = await screen.findByRole('button', {
        name: 'Retour'
      });
      await user.click(back);
      const modal = await screen.findByRole('dialog', {
        name: 'Ajouter dans un groupe de logements'
      });
      expect(modal).toBeVisible();
    });

    it('should create a new group', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });
      const group = genGroupDTO(auth);

      const { router } = renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [group],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const addToGroup = await screen.findByRole('button', {
        name: 'Ajouter dans un groupe'
      });
      await user.click(addToGroup);
      const createGroup = await screen.findByRole('button', {
        name: 'Créer un nouveau groupe'
      });
      await user.click(createGroup);
      const groupName = await screen.findByRole('textbox', {
        name: /Nom du groupe/
      });
      await user.type(groupName, 'Logements vacants');
      const groupDescription = await screen.findByRole('textbox', {
        name: /Description/
      });
      await user.type(groupDescription, 'Tous les logements vacants');
      const confirm = await screen.findByRole('button', {
        name: /Créer un groupe/
      });
      await user.click(confirm);
      expect(router.state.location.pathname).toStartWith('/groupes');
    });

    it('should create a new group with correct status when tab is changed', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO(), { count: 10 });

      // Create housings with specific statuses
      const waitingHousings = faker.helpers.multiple(
        () => ({
          ...genHousingDTO(),
          status: HousingStatus.WAITING
        }),
        { count: 3 }
      );

      const neverContactedHousings = faker.helpers.multiple(
        () => ({
          ...genHousingDTO(),
          status: HousingStatus.NEVER_CONTACTED
        }),
        { count: 5 }
      );

      const housings = [...waitingHousings, ...neverContactedHousings];

      const housingOwners = housings.flatMap((housing, i) => {
        const owner = owners[i % owners.length];
        return {
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: 1 as const
        };
      });
      const group = genGroupDTO(auth);

      const { router } = renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [group],
        campaigns: [],
        campaignHousings: []
      });
      expect(router).toBeDefined();

      // Switch to "En attente de retour" tab (WAITING status = 1)
      const waitingTab = await screen.findByRole('tab', {
        name: /En attente de retour/
      });
      await user.click(waitingTab);

      // Wait for the tab panel to be visible
      const panel = await screen.findByRole('tabpanel', {
        name: /En attente de retour/
      });
      expect(panel).toBeVisible();

      // Select all housings in the tab
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);

      // Click export or contact
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);

      // The modal should show the count for WAITING status only (3 housings)
      const modal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });

      // This will fail with the bug because it shows all housings (8) instead of just WAITING (3)
      const countText = await within(modal).findByText(/3 logements/);
      expect(countText).toBeVisible();
    });

    it.todo('should require a title and a description');

    it('should display an alert if trying to export without selecting housings', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);

      renderView({
        establishment,
        auth,
        housings: [],
        owners: [],
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const alert = await screen.findByRole('alert');
      expect(alert).toBeVisible();
    });
  });

  describe('Campaign creation', () => {
    it('should create a campaign', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });

      const { router } = renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', { name: 'Créer une campagne' });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, 'Tous les logements');
      const description = await within(campaignCreationModal).findByRole(
        'textbox',
        {
          name: /^Description/
        }
      );
      await user.type(description, 'Tous les logements disponibles');
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      expect(router.state.location.pathname).toStartWith('/campagnes/');
    });

    it('should require a title', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'Veuillez donner un nom à la campagne pour confirmer.'
      );
      expect(error).toBeVisible();
    });

    it('should restrict require the description', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, 'Tous les logements');
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'Veuillez donner une description à la campagne pour confirmer.'
      );
      expect(error).toBeVisible();
    });

    it('should restrict the title to 64 characters', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, faker.string.alpha({ length: 65 }));
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'La longueur maximale du titre est de 64 caractères.'
      );
      expect(error).toBeVisible();
    });

    it('should restrict the description to 1000 characters', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);
      const owners = faker.helpers.multiple(() => genOwnerDTO());
      const housings = faker.helpers.multiple(() => genHousingDTO());
      const housingOwners = housings.flatMap((housing) => {
        const subset = faker.helpers.arrayElements(owners, {
          min: 1,
          max: ACTIVE_OWNER_RANKS.length
        });
        return subset.map((owner, i) => ({
          ...genHousingOwnerDTO(owner),
          housingId: housing.id,
          ownerId: owner.id,
          rank: ACTIVE_OWNER_RANKS[i]
        }));
      });

      renderView({
        establishment,
        auth,
        housings,
        owners,
        housingOwners,
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const panel = await screen.findByRole('tabpanel', {
        name: /Tous/
      });
      const [checkbox] = await within(panel).findAllByRole('checkbox');
      await user.click(checkbox);
      const exportOrContact = await screen.findByRole('button', {
        name: 'Exporter ou contacter'
      });
      await user.click(exportOrContact);
      const groupOrCampaignCreationModal = await screen.findByRole('dialog', {
        name: 'Que souhaitez-vous faire ?'
      });
      const createCampaign = await within(
        groupOrCampaignCreationModal
      ).findByRole('button', {
        name: 'Créer une campagne'
      });
      await user.click(createCampaign);
      const campaignCreationInfoModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const skip = await within(campaignCreationInfoModal).findByRole(
        'button',
        {
          name: 'Créer une campagne'
        }
      );
      await user.click(skip);
      const campaignCreationModal = await screen.findByRole('dialog', {
        name: 'Créer une campagne'
      });
      const title = await within(campaignCreationModal).findByRole('textbox', {
        name: /^Titre de la campagne/
      });
      await user.type(title, 'Tous les logements');
      const confirm = await within(campaignCreationModal).findByRole('button', {
        name: 'Créer une campagne'
      });
      const description = await within(campaignCreationModal).findByRole(
        'textbox',
        {
          name: /^Description/
        }
      );
      await user.type(description, faker.string.alpha({ length: 1001 }));
      await user.click(confirm);
      const error = await within(campaignCreationModal).findByText(
        'La longueur maximale de la description est de 1000 caractères.'
      );
      expect(error).toBeVisible();
    });
  });

  describe('Housing tabs', () => {
    it('should select a default tab', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);

      renderView({
        establishment,
        auth,
        housings: [],
        owners: [],
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const tab = await screen.findByRole('tab', { selected: true });
      expect(tab).toHaveTextContent(/^Tous/);
    });

    it('should open another tab', async () => {
      const establishment = genEstablishmentDTO();
      const auth = genUserDTO(UserRole.USUAL, establishment);

      renderView({
        establishment,
        auth,
        housings: [],
        owners: [],
        housingOwners: [],
        groups: [],
        campaigns: [],
        campaignHousings: []
      });

      const tab = await screen.findByRole('tab', {
        selected: false,
        name: /^En attente de retour/
      });
      await user.click(tab);
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Filters', () => {
    describe('Status filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(accordion);
        const status = await screen.findByRole('combobox', {
          name: /Statut de suivi/
        });
        await user.click(status);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Non suivi');
        await user.click(option);
        await user.keyboard('{Escape}');
        const badge = await screen.findByText('Statut de suivi : non suivi');
        expect(badge).toBeVisible();
      });
    });

    describe('Substatus filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(accordion);
        const status = await screen.findByRole('combobox', {
          name: 'Statut de suivi'
        });
        await user.click(status);

        const statusOptions = await screen.findByRole('listbox');
        const statusOption =
          await within(statusOptions).findByText('Suivi en cours');
        await user.click(statusOption);
        await user.keyboard('{Escape}');

        const subStatus = await screen.findByRole('combobox', {
          name: 'Sous-statut de suivi'
        });
        await user.click(subStatus);
        const subStatusOptions = await screen.findByRole('listbox');
        const subStatusOption =
          await within(subStatusOptions).findByText('En accompagnement');
        await user.click(subStatusOption);
        const badge = await screen.findByText(
          'Sous-statut de suivi : en accompagnement'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Campaign filter', () => {
      it('should filter by a single campaign', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const housings = faker.helpers.multiple(() => genHousingDTO(), {
          count: 10
        });
        const owners = faker.helpers.multiple(() => genOwnerDTO(), {
          count: housings.length
        });
        const housingOwners = housings.flatMap((housing, i) => {
          const owner = owners[i];
          return {
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: 1 as const
          };
        });
        const campaigns = faker.helpers.multiple(() => genCampaignDTO());
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, 2)
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        const [campaign] = campaigns;
        const filteredHousings = data.campaignHousings.get(campaign.id) ?? [];
        const filteredOwners = pipe(
          filteredHousings,
          Array.map((filteredHousing) => {
            return (
              data.housingOwners
                .get(filteredHousing.id)
                ?.find(isPrimaryOwner) ?? null
            );
          }),
          Array.filter(Predicate.isNotNull),
          Array.dedupeWith((a, b) => a.id === b.id)
        );

        const mobilization = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(mobilization);
        const filter = await screen.findByLabelText(/^Campagne/);
        await user.click(filter);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByRole('option', {
          name: campaign.title
        });
        await user.click(option);
        await user.keyboard('{Escape}');
        const panel = await screen.findByRole('tabpanel', {
          name: /^Tous/
        });
        const count = await within(panel).findByText(
          `${filteredHousings.length} logements (${filteredOwners.length} propriétaires) filtrés sur un total de ${housings.length} logements`
        );
        expect(count).toBeVisible();
      });

      it('should filter by several campaigns', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const housings = faker.helpers.multiple(() => genHousingDTO(), {
          count: 10
        });
        const owners = faker.helpers.multiple(() => genOwnerDTO(), {
          count: housings.length
        });
        const housingOwners = housings.flatMap((housing, i) => {
          const owner = owners[i];
          return {
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: i as OwnerRank
          };
        });
        const campaigns = faker.helpers.multiple(() => genCampaignDTO());
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, 2)
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        const mobilization = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(mobilization);
        const filter = await screen.findByLabelText(/^Campagne/);
        await user.click(filter);
        const options = await screen.findByRole('listbox');
        const slice = campaigns.slice(0, 2);
        await async.forEachSeries(slice, async (campaign) => {
          const option = await within(options).findByText(campaign.title);
          await user.click(option);
        });
        await user.keyboard('{Escape}');
        const panel = await screen.findByRole('tabpanel', {
          name: /^Tous/
        });
        const filteredHousings = pipe(
          slice,
          Array.flatMap(
            (campaign) => data.campaignHousings.get(campaign.id) ?? []
          ),
          Array.dedupeWith((a, b) => a.id === b.id)
        );
        const count = await within(panel).findByText(
          `${filteredHousings.length} logements (${filteredHousings.length} propriétaires) filtrés sur un total de ${housings.length} logements`
        );
        expect(count).toBeVisible();
      });

      it('should remove the filter by campaigns', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const housings = faker.helpers.multiple(
          () => genHousingDTO(),
          { count: 10 }
        );
        const owners = faker.helpers.multiple(() => genOwnerDTO(), {
          count: housings.length
        });
        const housingOwners = housings.flatMap((housing, i) => {
          const owner = owners[i];
          return {
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: 1 as const
          };
        });
        const campaigns = CAMPAIGN_STATUS_VALUES.map((status) => ({
          ...genCampaignDTO(),
          status
        }));
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, 2)
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        const mobilization = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(mobilization);

        // Select options
        const filter = await screen.findByRole('combobox', {
          name: /^Campagne/
        });
        await user.click(filter);
        let listbox = await screen.findByRole('listbox', {
          name: /^Campagne/
        });
        const [campaign] = campaigns;
        let option = within(listbox).getByText(campaign.title);
        await user.click(option);
        await user.keyboard('{Escape}');
        const panel = await screen.findByRole('tabpanel', {
          name: /Tous/
        });
        const filteredHousings = data.campaignHousings.get(campaign.id) ?? [];
        const filteredOwners = pipe(
          filteredHousings,
          Array.map((filteredHousing) => {
            return (
              data.housingOwners
                .get(filteredHousing.id)
                ?.find(isPrimaryOwner) ?? null
            );
          }),
          Array.filter(Predicate.isNotNull),
          Array.dedupeWith((a, b) => a.id === b.id)
        );
        let count = await within(panel).findByText(
          `${filteredHousings.length} logements (${filteredOwners.length} propriétaires) filtrés sur un total de ${housings.length} logements`
        );
        expect(count).toBeVisible();

        // Deselect options
        await user.click(filter);
        listbox = await screen.findByRole('listbox', {
          name: /^Campagne/
        });
        option = within(listbox).getByText(campaign.title);
        await user.click(option);
        await user.keyboard('{Escape}');
        count = await within(panel).findByText(
          `${housings.length} logements (${owners.length} propriétaires)`
        );
        expect(count).toBeVisible();
      });

      it('should filter by a status', async () => {
        const status: CampaignStatus = 'draft';
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const housings = faker.helpers.multiple(() => genHousingDTO(), {
          count: 10
        });
        const owners = faker.helpers.multiple(() => genOwnerDTO(), {
          count: housings.length
        });
        const housingOwners = housings.flatMap((housing, i) => {
          const owner = owners[i];
          return {
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: 1 as const
          };
        });
        const campaigns = CAMPAIGN_STATUS_VALUES.map((status) => ({
          ...genCampaignDTO(),
          status
        }));
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, 2)
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        const mobilization = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(mobilization);
        const filter = await screen.findByLabelText(/^Campagne/);
        await user.click(filter);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText(
          CAMPAIGN_STATUS_LABELS[status]
        );
        await user.click(option);
        await user.keyboard('{Escape}');
        const panel = await screen.findByRole('tabpanel', {
          name: /^Tous/
        });
        const filteredHousings = pipe(
          campaigns,
          Array.filter((campaign) => campaign.status === status),
          Array.flatMap((campaign) => {
            return data.campaignHousings.get(campaign.id) ?? [];
          }),
          Array.dedupeWith((a, b) => a.id === b.id)
        );
        const count = await within(panel).findByText(
          `${filteredHousings.length} logements (${filteredHousings.length} propriétaires) filtrés sur un total de ${housings.length} logements`
        );
        expect(count).toBeVisible();
      });

      it('should remove the filter by status', async () => {
        const status: CampaignStatus = 'draft';
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const owners = faker.helpers.multiple(() => genOwnerDTO());
        const housings = faker.helpers.multiple(() => genHousingDTO(), {
          count: 10
        });
        const housingOwners = housings.flatMap((housing) => {
          const subset = faker.helpers.arrayElements(owners, {
            min: 1,
            max: ACTIVE_OWNER_RANKS.length
          });
          return subset.map((owner, i) => ({
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: ACTIVE_OWNER_RANKS[i]
          }));
        });
        const campaigns = CAMPAIGN_STATUS_VALUES.map((status) => ({
          ...genCampaignDTO(),
          status
        }));
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, 2)
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        // Select an option
        const mobilization = await screen.findByRole('button', {
          name: 'Suivi et campagnes'
        });
        await user.click(mobilization);
        const filter = await screen.findByLabelText(/^Campagne/);
        await user.click(filter);
        let listbox = await screen.findByRole('listbox');
        let option = await within(listbox).findByText(
          CAMPAIGN_STATUS_LABELS[status]
        );
        await user.click(option);
        await user.keyboard('{Escape}');
        const panel = await screen.findByRole('tabpanel', {
          name: /Tous/
        });
        let count = await within(panel).findByText(
          /^(\d+|un) logements? \((\d+|un) propriétaires?\) filtrés sur un total de \d+ logements$/
        );
        expect(count).toBeVisible();

        // Deselect options
        await user.click(filter);
        listbox = await screen.findByRole('listbox', {
          name: /^Campagne/
        });
        option = await within(listbox).findByText(
          CAMPAIGN_STATUS_LABELS[status]
        );
        await user.click(option);
        await user.keyboard('{Escape}');
        count = await within(panel).findByText(
          /^(\d+|un) logements? \((\d+|un) propriétaires?\)$/
        );
        expect(count).toBeVisible();
      });

      it('should select a status and its campaigns if at least one of the campaigns is not selected', async () => {
        const status: CampaignStatus = 'draft';
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const housings = faker.helpers.multiple(() => genHousingDTO());
        const owners = faker.helpers.multiple(() => genOwnerDTO(), {
          count: housings.length
        });
        const housingOwners = housings.flatMap((housing, i) => {
          const owner = owners[i];
          return {
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: 1 as const
          };
        });
        const campaigns = CAMPAIGN_STATUS_VALUES.map((status) => ({
          ...genCampaignDTO(),
          status
        }));
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, {
            min: 1,
            max: housings.length
          })
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        const mobilization = await screen.findByRole('button', {
          name: /^Suivi/
        });
        await user.click(mobilization);
        const filter = await screen.findByLabelText(/^Campagne/);
        await user.click(filter);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText(
          CAMPAIGN_STATUS_LABELS[status]
        );
        // Select the status
        await user.click(option);
        campaigns
          .filter((campaign) => campaign.status === status)
          .map((campaign) => {
            return within(options).getByRole('checkbox', {
              name: campaign.title
            });
          })
          .forEach((checkbox) => {
            expect(checkbox).toBeChecked();
          });
      });

      it('should unselect a status and its campaigns if all the campaigns of this status are selected', async () => {
        const status: CampaignStatus = 'draft';
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);
        const owners = faker.helpers.multiple(() => genOwnerDTO());
        const housings = faker.helpers.multiple(() => genHousingDTO());
        const housingOwners = housings.flatMap((housing) => {
          const subset = faker.helpers.arrayElements(owners, {
            min: 1,
            max: ACTIVE_OWNER_RANKS.length
          });
          return subset.map((owner, i) => ({
            ...genHousingOwnerDTO(owner),
            housingId: housing.id,
            ownerId: owner.id,
            rank: ACTIVE_OWNER_RANKS[i]
          }));
        });
        const campaigns = CAMPAIGN_STATUS_VALUES.map((status) => ({
          ...genCampaignDTO(),
          status
        }));
        const campaignHousings = campaigns.map((campaign) => ({
          campaign,
          housings: faker.helpers.arrayElements(housings, 2)
        }));

        renderView({
          establishment,
          auth,
          housings,
          owners,
          housingOwners,
          groups: [],
          campaigns,
          campaignHousings
        });

        const filter = await screen.findByLabelText(/^Campagne/);
        await user.click(filter);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText(
          CAMPAIGN_STATUS_LABELS[status]
        );
        await user.click(option);
        const checkboxes = campaigns
          .filter((campaign) => campaign.status === status)
          .map((campaign) => {
            return within(options).getByRole('checkbox', {
              name: campaign.title
            });
          });
        // Unselect the status
        await user.click(option);
        checkboxes.forEach((checkbox) => {
          expect(checkbox).not.toBeChecked();
        });
      });
    });

    describe('Vacancy year filter', () => {
      it('should disable the input if `Vacant` is not selected', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: /^Vie du logement$/,
          expanded: false
        });
        await user.click(accordion);
        const vacancyYear = await screen.findByRole('combobox', {
          name: 'Année de début de vacance'
        });
        expect(vacancyYear).toHaveAttribute('aria-disabled', 'true');
      });

      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Vie du logement'
        });
        await user.click(accordion);

        const occupancy = await screen.findByRole('combobox', {
          name: 'Occupation actuelle'
        });
        await user.click(occupancy);
        let options = await screen.findByRole('listbox');
        let option = await within(options).findByText('Vacant');
        await user.click(option);
        await user.keyboard('{Escape}');

        const vacancyYear = await screen.findByRole('combobox', {
          name: 'Année de début de vacance'
        });
        await user.click(vacancyYear);
        options = await screen.findByRole('listbox');
        option = await within(options).findByText('2021');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByRole('button', {
          name: /^Début de vacance : depuis 2021/
        });
        expect(badge).toBeVisible();
      });
    });

    describe('Housing kind filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: /^Logement/
        });
        await user.click(accordion);
        const kind = await screen.findByRole('combobox', {
          name: /^Type de logement/
        });
        await user.click(kind);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Appartement');
        await user.click(option);
        const badge = await screen.findByText('Type de logement : appartement');
        expect(badge).toBeVisible();
      });
    });

    describe('Locality kind filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Localisation'
        });
        await user.click(accordion);

        const localityKind = await screen.findByRole('combobox', {
          name: 'Type de commune'
        });
        await user.click(localityKind);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText(
          /^Petites villes de demain$/i
        );
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          /^Type de commune : petites villes de demain$/i
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Housing count filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Bâtiment/DPE'
        });
        await user.click(accordion);

        const housingCount = await screen.findByRole('combobox', {
          name: 'Nombre de logements'
        });
        await user.click(housingCount);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Moins de 5');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          'Nombre de logements : moins de 5'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Vacancy rate filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Bâtiment/DPE'
        });
        await user.click(accordion);

        const vacancyRate = await screen.findByRole('combobox', {
          name: 'Taux de vacance'
        });
        await user.click(vacancyRate);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Moins de 20%');
        await user.click(option);

        const badge = await screen.findByText('Taux de vacance : moins de 20%');
        expect(badge).toBeVisible();
      });
    });

    describe('Energy consumption filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Bâtiment/DPE'
        });
        await user.click(accordion);

        const dpe = await screen.findByRole('combobox', {
          name: 'Étiquette DPE représentatif (ADEME)'
        });
        await user.click(dpe);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('A');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText('DPE représentatif (ADEME) A');
        expect(badge).toBeVisible();
      });
    });

    describe('Building period filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Bâtiment/DPE'
        });
        await user.click(accordion);

        const constructionDate = await screen.findByRole('combobox', {
          name: 'Date de construction'
        });
        await user.click(constructionDate);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Avant 1919');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          'Date de construction : avant 1919'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Surface filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Logement'
        });
        await user.click(accordion);

        const surface = await screen.findByRole('combobox', {
          name: 'Surface'
        });
        await user.click(surface);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Moins de 35 m²');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText('Surface : moins de 35 m²');
        expect(badge).toBeVisible();
      });
    });

    describe('Room count filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Logement'
        });
        await user.click(accordion);

        const roomCount = await screen.findByRole('combobox', {
          name: 'Nombre de pièces'
        });
        await user.click(roomCount);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('1 pièce');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText('Nombre de pièces : 1');
        expect(badge).toBeVisible();
      });
    });

    describe('Cadastral classification filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Logement'
        });
        await user.click(accordion);

        const cadastralClassfication = await screen.findByRole('combobox', {
          name: 'Classement cadastral'
        });
        await user.click(cadastralClassfication);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('1 - Grand luxe');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          'Classement cadastral : 1 - Grand luxe'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Ownership kind filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Bâtiment/DPE'
        });
        await user.click(accordion);

        const ownershipKind = await screen.findByRole('combobox', {
          name: 'Type de propriété'
        });
        await user.click(ownershipKind);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Monopropriété');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          'Type de propriété : monopropriété'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Owner kind filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Propriétaires'
        });
        await user.click(accordion);

        const ownerKind = await screen.findByRole('combobox', {
          name: 'Type de propriétaire'
        });
        await user.click(ownerKind);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Particulier');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          'Type de propriétaire : particulier'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Owner age filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Propriétaires'
        });
        await user.click(accordion);

        const ownerAge = await screen.findByRole('combobox', {
          name: 'Âge'
        });
        await user.click(ownerAge);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Moins de 40 ans');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText('Âge : moins de 40 ans');
        expect(badge).toBeVisible();
      });
    });

    describe('Multi-owner filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Propriétaires'
        });
        await user.click(accordion);

        const multiOwner = await screen.findByRole('combobox', {
          name: 'Multi-propriétaire'
        });
        await user.click(multiOwner);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Oui');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText('Multi-propriétaire : oui');
        expect(badge).toBeVisible();
      });
    });

    describe('Secondary owner filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Propriétaires'
        });
        await user.click(accordion);

        const secondaryOwners = await screen.findByRole('combobox', {
          name: 'Propriétaires secondaires'
        });
        await user.click(secondaryOwners);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText('Aucun');
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          'Propriétaires secondaires : aucun bénéficiaire'
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Included data file years filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Fichiers sources'
        });
        await user.click(accordion);

        const dataFileYearsIncluded = await screen.findByRole('combobox', {
          name: 'Sources et millésimes inclus'
        });
        await user.click(dataFileYearsIncluded);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText(/^LOVAC 2020/);
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          /^Source et millésime inclus : LOVAC 2020/
        );
        expect(badge).toBeVisible();
      });
    });

    describe('Excluded data file years filter', () => {
      it('should display a badge', async () => {
        const establishment = genEstablishmentDTO();
        const auth = genUserDTO(UserRole.USUAL, establishment);

        renderView({
          establishment,
          auth,
          housings: [],
          owners: [],
          housingOwners: [],
          groups: [],
          campaigns: [],
          campaignHousings: []
        });

        const accordion = await screen.findByRole('button', {
          name: 'Fichiers sources'
        });
        await user.click(accordion);

        const dataFileYearsExcluded = await screen.findByRole('combobox', {
          name: 'Sources et millésimes exclus'
        });
        await user.click(dataFileYearsExcluded);
        const options = await screen.findByRole('listbox');
        const option = await within(options).findByText(/^LOVAC 2020/);
        await user.click(option);
        await user.keyboard('{Escape}');

        const badge = await screen.findByText(
          /^Source et millésime exclus : LOVAC 2020/
        );
        expect(badge).toBeVisible();
      });
    });
  });
});

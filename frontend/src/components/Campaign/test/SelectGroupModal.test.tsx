import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import createSelectGroupModal from '~/components/Campaign/SelectGroupModal';
import data from '~/mocks/handlers/data';
import { mockAPI } from '~/mocks/mock-api';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';

const selectGroupModal = createSelectGroupModal();
const creator = genUserDTO();

describe('SelectGroupModal', () => {
  const user = userEvent.setup();

  function renderModal(onSelect = vi.fn(), openCount?: number) {
    render(
      <Provider store={configureTestStore()}>
        <selectGroupModal.Component onSelect={onSelect} openCount={openCount} />
      </Provider>
    );
    selectGroupModal.open();
  }

  it('should exclude archived and empty groups from the list', async () => {
    const housings = [genHousingDTO()];
    const eligible = genGroupDTO(creator, housings);
    const archived = {
      ...genGroupDTO(creator, housings),
      archivedAt: new Date().toJSON()
    };
    const empty = genGroupDTO(creator, []);
    data.groups.push(eligible, archived, empty);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(eligible.title);
    expect(within(dialog).queryByText(archived.title)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(empty.title)).not.toBeInTheDocument();
  });

  it('should filter groups by a case-insensitive substring match on submit', async () => {
    const housings = [genHousingDTO()];
    const match = { ...genGroupDTO(creator, housings), title: 'URBA-EXP' };
    const nonMatch = {
      ...genGroupDTO(creator, housings),
      title: 'CITE-AVENIR'
    };
    data.groups.push(match, nonMatch);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(match.title);
    const input = within(dialog).getByRole('searchbox', {
      name: 'Rechercher un groupe'
    });
    await user.type(input, 'urba');
    const searchButton = within(dialog).getByRole('button', {
      name: 'Rechercher'
    });
    await user.click(searchButton);

    await within(dialog).findByText(match.title);
    expect(within(dialog).queryByText(nonMatch.title)).not.toBeInTheDocument();
  });

  it('should sort groups by creation date, most recent first', async () => {
    const housings = [genHousingDTO()];
    const oldest = {
      ...genGroupDTO(creator, housings),
      title: 'Oldest',
      createdAt: new Date('2024-01-01').toJSON()
    };
    const newest = {
      ...genGroupDTO(creator, housings),
      title: 'Newest',
      createdAt: new Date('2024-06-01').toJSON()
    };
    const middle = {
      ...genGroupDTO(creator, housings),
      title: 'Middle',
      createdAt: new Date('2024-03-01').toJSON()
    };
    data.groups.push(oldest, newest, middle);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    const table = await within(dialog).findByRole('table');
    await within(table).findByText('Newest');
    const rows = within(table).getAllByRole('row').slice(1);
    const titles = rows.map((row) => row.textContent);
    expect(titles[0]).toContain('Newest');
    expect(titles[1]).toContain('Middle');
    expect(titles[2]).toContain('Oldest');
  });

  it('should show no rows when the search matches nothing', async () => {
    const housings = [genHousingDTO()];
    data.groups.push({
      ...genGroupDTO(creator, housings),
      title: 'URBA-EXP'
    });

    renderModal();

    const dialog = await screen.findByRole('dialog');
    const table = await within(dialog).findByRole('table');
    const input = within(dialog).getByRole('searchbox', {
      name: 'Rechercher un groupe'
    });
    await user.type(input, 'no-match-at-all');
    const searchButton = within(dialog).getByRole('button', {
      name: 'Rechercher'
    });
    await user.click(searchButton);

    expect(within(table).queryAllByRole('row')).toHaveLength(1); // header row only
  });

  it('should call onSelect with the chosen group', async () => {
    const housings = [genHousingDTO()];
    const group = genGroupDTO(creator, housings);
    data.groups.push(group);
    const onSelect = vi.fn();

    renderModal(onSelect);

    const dialog = await screen.findByRole('dialog');
    const selectButton = await within(dialog).findByRole('button', {
      name: `Sélectionner le groupe ${group.title}`
    });
    await user.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: group.id, title: group.title })
    );
  });

  it('should not query groups until the flow has been opened', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    renderModal(vi.fn(), 0);

    const dialog = await screen.findByRole('dialog');
    // openCount 0 → the groups query is skipped, so nothing loads.
    expect(within(dialog).queryByText(group.title)).not.toBeInTheDocument();
  });

  it('should query groups once the flow has been opened', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    renderModal(vi.fn(), 1);

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(group.title);
  });

  it('should announce the result count in a status region', async () => {
    const housings = [genHousingDTO()];
    data.groups.push(
      genGroupDTO(creator, housings),
      genGroupDTO(creator, housings)
    );

    renderModal(vi.fn(), 1);

    const dialog = await screen.findByRole('dialog');
    const status = await within(dialog).findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('2 groupes trouvés'));
  });

  it('should show an error with a retry action, not an empty result, when loading groups fails', async () => {
    mockAPI.use(
      http.get(`${config.apiEndpoint}/groups`, () =>
        HttpResponse.json({ message: 'Boom' }, { status: 500 })
      )
    );

    renderModal(vi.fn(), 1);

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Impossible de charger les groupes');
    expect(
      within(dialog).getByRole('button', { name: 'Réessayer' })
    ).toBeInTheDocument();
    // A technical failure must not be announced as a genuine empty result.
    expect(
      within(dialog).queryByText('Aucun groupe trouvé')
    ).not.toBeInTheDocument();
  });

  it('should reload the groups when the user retries after a failure', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    let calls = 0;
    mockAPI.use(
      http.get(`${config.apiEndpoint}/groups`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ message: 'Boom' }, { status: 500 })
          : HttpResponse.json(data.groups);
      })
    );

    renderModal(vi.fn(), 1);

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Impossible de charger les groupes');

    await user.click(within(dialog).getByRole('button', { name: 'Réessayer' }));

    await within(dialog).findByText(group.title);
    expect(
      within(dialog).queryByText('Impossible de charger les groupes')
    ).not.toBeInTheDocument();
  });

  it('should show the page size as static text instead of an editable select', async () => {
    const housings = [genHousingDTO()];
    data.groups.push(genGroupDTO(creator, housings));

    renderModal(vi.fn(), 1);

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('5 lignes par page');
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should display the group count as visible text above the table', async () => {
    const housings = [genHousingDTO()];
    data.groups.push(
      genGroupDTO(creator, housings),
      genGroupDTO(creator, housings)
    );

    renderModal(vi.fn(), 1);

    const dialog = await screen.findByRole('dialog');
    const status = await within(dialog).findByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('2 groupes trouvés'));
    // The count must be visible, not screen-reader-only.
    expect(status).not.toHaveClass('fr-sr-only');
  });

  it('should restore the full list when an empty search is submitted', async () => {
    const housings = [genHousingDTO()];
    const match = { ...genGroupDTO(creator, housings), title: 'URBA-EXP' };
    const other = { ...genGroupDTO(creator, housings), title: 'CITE-AVENIR' };
    data.groups.push(match, other);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(other.title);
    const input = within(dialog).getByRole('searchbox', {
      name: 'Rechercher un groupe'
    });
    const searchButton = within(dialog).getByRole('button', {
      name: 'Rechercher'
    });

    // Filter down to a single group.
    await user.type(input, 'urba');
    await user.click(searchButton);
    await within(dialog).findByText(match.title);
    expect(within(dialog).queryByText(other.title)).not.toBeInTheDocument();

    // Submitting an empty search brings the whole list back.
    await user.clear(input);
    await user.click(searchButton);
    await within(dialog).findByText(other.title);
    expect(within(dialog).getByText(match.title)).toBeInTheDocument();
  });
});

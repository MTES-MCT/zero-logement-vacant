import { Store } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { MemoryRouter as Router } from 'react-router-dom';

import { genGroupDTO, genUserDTO, GroupDTO } from '@zerologementvacant/models';
import GroupHeader, { DISPLAY_GROUPS } from './GroupHeader';
import configureTestStore from '../../utils/test/storeUtils';
import { mockAPI } from '../../mocks/mock-api';
import config from '../../utils/config';

describe('GroupHeader', () => {
  const user = userEvent.setup();

  let store: Store;

  beforeEach(() => {
    store = configureTestStore();
  });

  it('should render', async () => {
    mockAPI.use(
      http.get(`${config.apiEndpoint}/api/groups`, () => {
        const groups = Array.from({ length: DISPLAY_GROUPS + 1, }, () => {
          const creator = genUserDTO();
          return genGroupDTO(creator);
        });
        return HttpResponse.json(groups);
      })
    );

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>
    );

    const displayMore = await screen.findByText(/^Afficher plus/);
    expect(displayMore).toBeVisible();
  });

  it('should hide groups that have been archived', async () => {
    const creator = genUserDTO();
    const archived: GroupDTO = {
      ...genGroupDTO(creator),
      archivedAt: new Date().toJSON(),
    };
    const groups: GroupDTO[] = Array.from({ length: 2, }, () =>
      genGroupDTO(creator)
    ).concat(archived);
    mockAPI.use(
      http.get(`${config.apiEndpoint}/api/groups`, () => {
        return HttpResponse.json(groups);
      })
    );

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>
    );

    const cards = await screen.findAllByRole('group-card');
    expect(cards).toBeArrayOfSize(
      groups.filter((group) => !group.archivedAt).length
    );
  });

  it('should hide the "Display more" button if there is no more group', async () => {
    mockAPI.use(
      http.get(`${config.apiEndpoint}/api/groups`, () => {
        const groups = Array.from({ length: DISPLAY_GROUPS, }, () => {
          const creator = genUserDTO();
          return genGroupDTO(creator);
        });
        return HttpResponse.json(groups);
      })
    );

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>
    );

    await expect(screen.findByText(/^Afficher plus/)).toReject();
  });

  it('should display all groups when the "Display more" button is clicked', async () => {
    const creator = genUserDTO();
    const groups: GroupDTO[] = Array.from({ length: DISPLAY_GROUPS + 1, }, () =>
      genGroupDTO(creator)
    );
    mockAPI.use(
      http.get(`${config.apiEndpoint}/api/groups`, () => {
        return HttpResponse.json(groups);
      })
    );

    render(
      <Provider store={store}>
        <Router>
          <GroupHeader />
        </Router>
      </Provider>
    );

    const displayMore = await screen.findByText(/^Afficher plus/);
    await user.click(displayMore);
    const titles = await Promise.all(
      groups.map((group) => screen.findByText(group.title))
    );
    titles.forEach((title) => {
      expect(title).toBeVisible();
    });
  });
});

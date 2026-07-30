import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardDTO } from '@zerologementvacant/models';
import {
  genCardDataDTO,
  genDashboardDTO,
  genFlatNumberCard
} from '@zerologementvacant/models/fixtures';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { mockAPI } from '~/mocks/mock-api';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';

import AnalysisViewNext from '../AnalysisViewNext';

function setup(
  dashboardHandler: Parameters<typeof http.get>[1],
  cardHandler: Parameters<typeof http.get>[1] = ({ params }) =>
    HttpResponse.json(genCardDataDTO({ id: Number(params.cid), data: 12345 }))
) {
  mockAPI.use(
    http.get(`${config.apiEndpoint}/dashboards/:id`, dashboardHandler),
    http.get(`${config.apiEndpoint}/dashboards/:did/cards/:cid`, cardHandler)
  );

  const router = createMemoryRouter(
    [
      {
        path: '/analyses/parc-vacant',
        element: (
          <AnalysisViewNext id="13-analyses" title="Analyse du parc vacant" />
        )
      }
    ],
    { initialEntries: ['/analyses/parc-vacant'] }
  );

  render(
    <Provider store={configureTestStore()}>
      <RouterProvider router={router} />
    </Provider>
  );
}

describe('AnalysisViewNext', () => {
  it('shows a skeleton while the dashboard is loading', () => {
    setup(async () => new Promise(() => {}));

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('shows an error when the dashboard request fails', async () => {
    setup(() => HttpResponse.json({ message: 'Error' }, { status: 500 }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders cards directly when dashboard has no tabs', async () => {
    const card = genFlatNumberCard({ id: 929, title: 'Logements vacants' });
    const dashboard = genDashboardDTO({ cards: [card] });

    setup(() => HttpResponse.json(dashboard));

    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
  });

  it('renders tab labels when dashboard has tabs', async () => {
    const card = genFlatNumberCard({ id: 929, title: 'Logements vacants' });
    const dashboard: DashboardDTO = {
      id: 13,
      tabs: [{ id: 1, title: 'Parc vacant', cards: [card] }]
    };

    setup(() => HttpResponse.json(dashboard));

    expect(await screen.findByText('Parc vacant')).toBeInTheDocument();
    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
  });

  it('loads cards only when their tab is selected', async () => {
    const user = userEvent.setup();
    const firstCard = genFlatNumberCard({
      id: 929,
      title: 'Logements vacants'
    });
    const secondCard = genFlatNumberCard({
      id: 930,
      title: 'Évolution de la vacance'
    });
    const dashboard: DashboardDTO = {
      id: 38,
      tabs: [
        { id: 54, title: 'Parc vacant', cards: [firstCard] },
        { id: 55, title: 'Évolution', cards: [secondCard] }
      ]
    };
    const requestedCards: number[] = [];

    setup(
      () => HttpResponse.json(dashboard),
      ({ params }) => {
        const cardId = Number(params.cid);
        requestedCards.push(cardId);
        return HttpResponse.json(genCardDataDTO({ id: cardId, data: 12345 }));
      }
    );

    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
    expect(
      screen.getByRole('tablist', { name: 'Analyse du parc vacant' })
    ).toBeInTheDocument();
    expect(requestedCards).toEqual([929]);

    await user.click(screen.getByRole('tab', { name: 'Évolution' }));

    expect(
      await screen.findByText('Évolution de la vacance')
    ).toBeInTheDocument();
    expect(requestedCards).toEqual([929, 930]);

    await user.keyboard('{ArrowLeft}');

    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Parc vacant' })).toHaveFocus();
    expect(requestedCards).toEqual([929, 930]);
  });
});

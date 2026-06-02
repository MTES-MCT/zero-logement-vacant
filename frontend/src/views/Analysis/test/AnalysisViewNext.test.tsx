import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';

import type { DashboardDTO } from '@zerologementvacant/models';
import {
  genCardDataDTO,
  genDashboardDTO,
  genFlatNumberCard
} from '@zerologementvacant/models/fixtures';
import { mockAPI } from '~/mocks/mock-api';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';
import AnalysisViewNext from '../AnalysisViewNext';

function setup(dashboardHandler: Parameters<typeof http.get>[1]) {
  mockAPI.use(
    http.get(`${config.apiEndpoint}/dashboards/:id`, dashboardHandler),
    http.get(
      `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
      ({ params }) =>
        HttpResponse.json(genCardDataDTO({ id: Number(params.cid), data: 12345 }))
    )
  );

  const router = createMemoryRouter(
    [
      {
        path: '/analyses/parc-vacant',
        element: <AnalysisViewNext id="13-analyses" />
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
      url: 'https://stats.zlv.beta.gouv.fr/embed/dashboard/fake',
      tabs: [{ id: 1, title: 'Parc vacant', cards: [card] }]
    };

    setup(() => HttpResponse.json(dashboard));

    expect(await screen.findByText('Parc vacant')).toBeInTheDocument();
    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
  });
});

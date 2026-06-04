import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import {
  genCardDataDTO,
  genFlatNumberCard,
  genPercentageCard,
  genPieChartCard,
  genPieChartDataDTO
} from '@zerologementvacant/models/fixtures';
import { mockAPI } from '~/mocks/mock-api';
import config from '~/utils/config';
import configureTestStore from '~/utils/storeUtils';
import AnalysisCard from '../AnalysisCard';

function setup(props: React.ComponentProps<typeof AnalysisCard>) {
  render(
    <Provider store={configureTestStore()}>
      <AnalysisCard {...props} />
    </Provider>
  );
}

describe('AnalysisCard', () => {
  const card = genFlatNumberCard({ id: 929, title: 'Logements vacants', decimals: 0 });
  const dashboardId = '13-analyses' as const;

  it('shows a skeleton while loading', () => {
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        async () => new Promise(() => {})
      )
    );

    setup({ card, dashboardId });

    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json({ message: 'Error' }, { status: 500 })
      )
    );

    setup({ card, dashboardId });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('displays a flat number value', async () => {
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(genCardDataDTO({ id: 929, data: 51884 }))
      )
    );

    setup({ card, dashboardId });

    expect(await screen.findByText('Logements vacants')).toBeInTheDocument();
    // fr-FR formats 51884 as "51 884" with narrow no-break space (U+202F)
    expect(await screen.findByText(/51[\s ]884/)).toBeInTheDocument();
  });

  it('displays a percentage value', async () => {
    const percentCard = genPercentageCard({ id: 929, decimals: 1 });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(genCardDataDTO({ id: 929, data: 0.4823 }))
      )
    );

    setup({ card: percentCard, dashboardId });

    // Intl.NumberFormat 'percent' multiplies by 100: 0.4823 → 48.2 %
    expect(await screen.findByText(/48[,.]2/)).toBeInTheDocument();
  });

  it('renders a pie chart card without error when card type is pie-chart', async () => {
    const card = genPieChartCard({ id: 77, title: 'Répartition par type' });
    const cardData = genPieChartDataDTO({
      id: 77,
      labels: ['APPART', 'MAISON'],
      data: [4876, 652]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card, dashboardId });

    await screen.findByText('Répartition par type');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import {
  genBarChartCard,
  genBarChartDataDTO,
  genFlatNumberCard,
  genPercentageCard,
  genPieChartCard,
  genPieChartDataDTO,
  genScalarCardDataDTO,
  genTableCard,
  genTableDataDTO
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
        () => HttpResponse.json(genScalarCardDataDTO({ id: 929, data: 51884 }))
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
        () => HttpResponse.json(genScalarCardDataDTO({ id: 929, data: 0.4823 }))
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

  it('renders a bar chart card without error when card type is bar-chart', async () => {
    const barCard = genBarChartCard({ id: 80, title: 'Répartition par date de construction' });
    const cardData = genBarChartDataDTO({
      id: 80,
      direction: 'vertical',
      labels: ['1991 et apres', '1946 - 1990'],
      data: [3200, 1800]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: barCard, dashboardId });

    await screen.findByText('Répartition par date de construction');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a transcription accordion for a pie chart', async () => {
    const pieCard = genPieChartCard({ id: 77, title: 'Répartition par type' });
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

    setup({ card: pieCard, dashboardId });

    await screen.findByText('Répartition par type');
    expect(screen.getByRole('button', { name: /Transcription/i })).toBeInTheDocument();
  });

  it('shows percentage transcription items for a pie chart', async () => {
    const pieCard = genPieChartCard({ id: 77, title: 'Répartition par type' });
    // 4876 / (4876 + 652) * 100 = 88.2 → 88%
    // 652  / (4876 + 652) * 100 = 11.8 → 12%
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

    setup({ card: pieCard, dashboardId });

    await screen.findByText('Répartition par type');
    expect(screen.getByText('APPART : 88 %')).toBeInTheDocument();
    expect(screen.getByText('MAISON : 12 %')).toBeInTheDocument();
  });

  it('shows a transcription accordion for a bar chart', async () => {
    const barCard = genBarChartCard({ id: 80, title: 'Répartition par date de construction' });
    const cardData = genBarChartDataDTO({
      id: 80,
      direction: 'vertical',
      labels: ['1991 et apres', '1946 - 1990'],
      data: [3200, 1800]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: barCard, dashboardId });

    await screen.findByText('Répartition par date de construction');
    expect(screen.getByRole('button', { name: /Transcription/i })).toBeInTheDocument();
  });

  it('shows raw value transcription items for a bar chart', async () => {
    const barCard = genBarChartCard({ id: 80, title: 'Répartition par date de construction' });
    const cardData = genBarChartDataDTO({
      id: 80,
      direction: 'vertical',
      labels: ['1991 et apres', '1946 - 1990'],
      data: [3200, 1800]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: barCard, dashboardId });

    await screen.findByText('Répartition par date de construction');
    expect(screen.getByText('1991 et apres : 3200')).toBeInTheDocument();
    expect(screen.getByText('1946 - 1990 : 1800')).toBeInTheDocument();
  });

  it('renders a table card with PM-curated headers', async () => {
    const tableCard = genTableCard({ id: 90, title: 'Statistiques par EPCI' });
    const cardData = genTableDataDTO({
      id: 90,
      columns: [
        { name: 'code', displayName: 'Code EPCI', baseType: 'string' },
        { name: 'rate', displayName: 'Taux', baseType: 'number', decimals: 1, numberStyle: 'percent' }
      ],
      rows: [
        ['200054807', 0.123],
        ['243500139', 0.087]
      ]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: tableCard, dashboardId });

    await screen.findByText('Statistiques par EPCI');
    expect(screen.getByRole('columnheader', { name: /Code EPCI/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Taux/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '200054807' })).toBeInTheDocument();
    // fr-FR locale formats 0.123 as "12,3 %" (narrow no-break space U+202F)
    expect(screen.getByText(/12[,.]3[\s ]%/)).toBeInTheDocument();
  });

  it('formats numeric cells with fr-FR locale and applies suffix', async () => {
    const tableCard = genTableCard({ id: 91, title: 'Surfaces' });
    const cardData = genTableDataDTO({
      id: 91,
      columns: [
        { name: 'label', displayName: 'Libellé', baseType: 'string' },
        { name: 'amount', displayName: 'Montant', baseType: 'number', suffix: ' €' }
      ],
      rows: [['Total', 1234567]]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: tableCard, dashboardId });

    // fr-FR formats 1234567 with narrow no-break space thousand separators
    expect(await screen.findByText(/1[\s ]234[\s ]567 €/)).toBeInTheDocument();
  });

  it('renders null cell values as an empty string', async () => {
    const tableCard = genTableCard({ id: 92, title: 'Vide' });
    const cardData = genTableDataDTO({
      id: 92,
      columns: [
        { name: 'label', displayName: 'Libellé', baseType: 'string' },
        { name: 'count', displayName: 'Total', baseType: 'number' }
      ],
      rows: [['Sans donnée', null]]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: tableCard, dashboardId });

    await screen.findByText('Sans donnée');
    const row = screen.getByText('Sans donnée').closest('tr');
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement).getAllByRole('cell');
    expect(cells[1].textContent).toBe('');
  });

  it('formats date cells with fr-FR locale', async () => {
    const tableCard = genTableCard({ id: 94, title: 'Dates' });
    const cardData = genTableDataDTO({
      id: 94,
      columns: [
        { name: 'event_at', displayName: 'Date', baseType: 'date' }
      ],
      rows: [['2024-03-15T10:30:00.000Z']]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: tableCard, dashboardId });

    expect(await screen.findByText('15/03/2024')).toBeInTheDocument();
  });

  it('exposes the card title as the table caption (aria-label)', async () => {
    const tableCard = genTableCard({ id: 95, title: 'Tableau intitulé' });
    const cardData = genTableDataDTO({
      id: 95,
      columns: [{ name: 'label', displayName: 'Libellé', baseType: 'string' }],
      rows: [['valeur']]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: tableCard, dashboardId });

    expect(
      await screen.findByRole('table', { name: 'Tableau intitulé' })
    ).toBeInTheDocument();
  });

  it('sorts numeric rows when a sortable column header is clicked', async () => {
    const user = userEvent.setup();
    const tableCard = genTableCard({ id: 93, title: 'Tri numérique' });
    const cardData = genTableDataDTO({
      id: 93,
      columns: [
        { name: 'label', displayName: 'Libellé', baseType: 'string' },
        { name: 'amount', displayName: 'Montant', baseType: 'number' }
      ],
      rows: [
        ['A', 30],
        ['B', 10],
        ['C', 20]
      ]
    });
    mockAPI.use(
      http.get(
        `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
        () => HttpResponse.json(cardData)
      )
    );

    setup({ card: tableCard, dashboardId });

    await screen.findByText('Tri numérique');
    // AdvancedTable renders a SortButton beside sortable headers. Its accessible name
    // comes from columnDef.meta?.sort?.title and falls back to `Trier par ${header.id}`.
    // We use the column id here, which equals meta.name ("amount").
    const sortButton = await screen.findByRole('button', { name: /Trier par amount/i });
    // First click → descending; second click → ascending
    await user.click(sortButton);
    await user.click(sortButton);

    const labelCells = screen.getAllByRole('cell').filter(
      (c) => c.textContent && /^[ABC]$/.test(c.textContent.trim())
    );
    // After ascending sort by amount: B (10), C (20), A (30)
    expect(labelCells.map((c) => c.textContent?.trim())).toEqual(['B', 'C', 'A']);
  });
});

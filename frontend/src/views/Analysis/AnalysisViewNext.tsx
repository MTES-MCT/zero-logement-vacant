import Alert from '@codegouvfr/react-dsfr/Alert';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { DashboardCard, Resource, Tab } from '@zerologementvacant/models';
import { useState } from 'react';

import AnalysisCard from '~/components/Analysis/AnalysisCard';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFindOneDashboardQuery } from '~/services/dashboard.service';

interface Props {
  id: Resource;
  title?: string;
  description?: string;
}

const CardGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(24, 1fr)',
  gap: '1rem'
});

interface CardCellProps {
  col: number;
  row: number;
  width: number;
  height: number;
}

const CardCell = styled(Box, {
  shouldForwardProp: (prop) =>
    !['col', 'row', 'width', 'height'].includes(prop as string)
})<CardCellProps>(({ col, row, width, height }) => ({
  gridColumn: `${col + 1} / span ${width}`,
  gridRow: `${row + 1} / span ${height}`
}));

interface CardGridContentProps {
  cards: ReadonlyArray<DashboardCard>;
  dashboardId: Resource | number;
}

function CardGridContent({
  cards,
  dashboardId
}: Readonly<CardGridContentProps>) {
  return (
    <CardGrid>
      {cards.map((card) => (
        <CardCell
          key={card.id}
          col={card.position.col}
          row={card.position.row}
          width={card.size.width}
          height={card.size.height}
        >
          <AnalysisCard card={card} dashboardId={dashboardId} />
        </CardCell>
      ))}
    </CardGrid>
  );
}

interface DashboardTabsProps {
  dashboard: { id: number; tabs: ReadonlyArray<Tab> };
  label: string;
}

function DashboardTabs({ dashboard, label }: Readonly<DashboardTabsProps>) {
  const [selectedTabId, setSelectedTabId] = useState(
    String(dashboard.tabs[0]?.id)
  );
  const selectedTab =
    dashboard.tabs.find((tab) => String(tab.id) === selectedTabId) ??
    dashboard.tabs[0];

  if (!selectedTab) {
    return null;
  }

  return (
    <Tabs
      label={label}
      tabs={dashboard.tabs.map((tab) => ({
        tabId: String(tab.id),
        label: tab.title
      }))}
      selectedTabId={String(selectedTab.id)}
      onTabChange={setSelectedTabId}
    >
      <CardGridContent cards={selectedTab.cards} dashboardId={dashboard.id} />
    </Tabs>
  );
}

function AnalysisViewNext({
  id,
  title = 'Analyse du parc vacant',
  description
}: Readonly<Props>) {
  useDocumentTitle(title);
  const {
    data: dashboard,
    isLoading,
    isError
  } = useFindOneDashboardQuery({ id });

  return (
    <Container maxWidth={false} sx={{ py: '2rem' }}>
      <Box sx={{ mb: '1.5rem' }}>
        <Typography
          component="h1"
          variant="h2"
          sx={{ mb: description ? '0.5rem' : 0 }}
        >
          {title}
        </Typography>
        {description && <Typography>{description}</Typography>}
      </Box>

      {isLoading && (
        <Skeleton
          data-testid="dashboard-skeleton"
          animation={false}
          variant="rectangular"
          width="100%"
          height="20rem"
        />
      )}
      {isError && (
        <Alert
          as="h2"
          severity="error"
          title="Impossible de charger le tableau de bord"
          description=""
        />
      )}
      {dashboard &&
        ('tabs' in dashboard ? (
          <DashboardTabs
            key={dashboard.id}
            dashboard={dashboard}
            label={title}
          />
        ) : (
          <CardGridContent cards={dashboard.cards} dashboardId={dashboard.id} />
        ))}
    </Container>
  );
}

export default AnalysisViewNext;

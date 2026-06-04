import Alert from '@codegouvfr/react-dsfr/Alert';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import type { DashboardCard, Resource } from '@zerologementvacant/models';
import AnalysisCard from '~/components/Analysis/AnalysisCard';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFindOneDashboardNextQuery } from '~/services/dashboard.service';

interface Props {
  id: Resource;
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

function AnalysisViewNext({ id }: Readonly<Props>) {
  useDocumentTitle('Analyse du parc vacant');
  const {
    data: dashboard,
    isLoading,
    isError
  } = useFindOneDashboardNextQuery({ id });

  return (
    <Container maxWidth={false} sx={{ py: '2rem' }}>
      <Typography component="h1" variant="h2" sx={{ mb: '1.5rem' }}>
        Analyse du parc vacant
      </Typography>

      {isLoading && (
        <Skeleton
          data-testid="dashboard-skeleton"
          variant="rectangular"
          width="100%"
          height="20rem"
        />
      )}
      {isError && (
        <Alert
          severity="error"
          title="Impossible de charger le tableau de bord"
          description=""
        />
      )}
      {dashboard &&
        ('tabs' in dashboard ? (
          <Tabs
            tabs={dashboard.tabs.map((tab) => ({
              label: tab.title,
              content: (
                <CardGridContent cards={tab.cards} dashboardId={dashboard.id} />
              )
            }))}
          />
        ) : (
          <CardGridContent cards={dashboard.cards} dashboardId={dashboard.id} />
        ))}
    </Container>
  );
}

export default AnalysisViewNext;

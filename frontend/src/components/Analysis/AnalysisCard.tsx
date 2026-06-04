import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import type { DashboardCard, Resource } from '@zerologementvacant/models';

import { useFindOneCardQuery } from '~/services/dashboard.service';

interface Props {
  card: DashboardCard;
  dashboardId: Resource | number;
}

const CardBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem'
});

const ShowcaseValue = styled(Typography)({
  fontSize: '3rem',
  fontWeight: 700,
  lineHeight: '3.5rem',
  color: fr.colors.decisions.text.title.grey.default
});

function formatValue(data: number, card: DashboardCard): string {
  if (card.type === 'percentage') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      maximumFractionDigits: card.decimals
    }).format(data);
  }
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: card.decimals
  }).format(data);
}

function AnalysisCard({ card, dashboardId }: Readonly<Props>) {
  const { data, isLoading, isError } = useFindOneCardQuery({
    did: dashboardId,
    cid: card.id
  });

  if (isLoading) {
    return (
      <Skeleton
        data-testid="card-skeleton"
        variant="rectangular"
        width="100%"
        height="4rem"
      />
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        title="Impossible de charger ce graphique"
        description=""
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <CardBox>
      <Stack component="header">
        <Typography variant="h5" component="h3">
          {card.title}
        </Typography>
        {card.description !== null && (
          <Typography>{card.description}</Typography>
        )}
      </Stack>

      <ShowcaseValue>{formatValue(data.data, card)}</ShowcaseValue>
    </CardBox>
  );
}

export default AnalysisCard;

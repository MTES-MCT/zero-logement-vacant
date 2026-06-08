import { fr } from '@codegouvfr/react-dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import Alert from '@codegouvfr/react-dsfr/Alert';
import { BarChart } from '@codegouvfr/react-dsfr/Chart/BarChart';
import { PieChart } from '@codegouvfr/react-dsfr/Chart/PieChart';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import type {
  BarChartDataDTO,
  DashboardCard,
  PieChartDataDTO,
  Resource
} from '@zerologementvacant/models';
import { Array, pipe } from 'effect';
import { match } from 'ts-pattern';

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

interface ChartTranscriptionProps {
  labels: string[];
  data: number[];
  type: 'pie-chart' | 'bar-chart';
}

function ChartTranscription({
  labels,
  data,
  type
}: Readonly<ChartTranscriptionProps>) {
  const items = match(type)
    .with('pie-chart', () => {
      const total = pipe(
        data,
        Array.reduce(0, (acc, v) => acc + v)
      );
      if (total === 0) return [];
      return pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${Math.round((value / total) * 100)} %`)
      );
    })
    .with('bar-chart', () =>
      pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${value}`)
      )
    )
    .exhaustive();

  return (
    <Accordion label="Transcription">
      <List>
        {items.map((item, index) => (
          <ListItem key={index}>{item}</ListItem>
        ))}
      </List>
    </Accordion>
  );
}

interface PieChartDisplayProps {
  cardData: PieChartDataDTO;
}

function PieChartDisplay({ cardData }: Readonly<PieChartDisplayProps>) {
  return (
    <>
      <PieChart
        x={cardData.labels}
        y={cardData.data}
        name={cardData.labels}
        color={[
          'blue-france',
          'blue-cumulus',
          'blue-ecume',
          'green-archipel',
          'green-bourgeon',
          'green-emeraude',
          'green-menthe',
          'green-tilleul-verveine'
        ]}
      />
      <ChartTranscription
        labels={cardData.labels}
        data={cardData.data}
        type="pie-chart"
      />
    </>
  );
}

interface BarChartDisplayProps {
  cardData: BarChartDataDTO;
}

function BarChartDisplay({ cardData }: Readonly<BarChartDisplayProps>) {
  return (
    <>
      <BarChart
        x={[cardData.labels]}
        y={[cardData.data]}
        horizontal={cardData.direction === 'horizontal'}
      />
      <ChartTranscription
        labels={cardData.labels}
        data={cardData.data}
        type="bar-chart"
      />
    </>
  );
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

      {match(data)
        .with({ type: 'pie-chart' }, (d) => (
          <PieChartDisplay cardData={d} />
        ))
        .with({ type: 'bar-chart' }, (d) => (
          <BarChartDisplay cardData={d} />
        ))
        .otherwise((d) => (
          <ShowcaseValue>{formatValue(d.data, card)}</ShowcaseValue>
        ))}
    </CardBox>
  );
}

export default AnalysisCard;

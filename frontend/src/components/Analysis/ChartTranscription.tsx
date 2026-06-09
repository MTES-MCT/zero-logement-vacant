import Accordion from '@codegouvfr/react-dsfr/Accordion';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { Array, pipe } from 'effect';
import { match } from 'ts-pattern';

interface ChartTranscriptionProps {
  labels: string[];
  data: number[];
  type: 'pie-chart' | 'bar-chart' | 'line-chart';
  format?: 'number' | 'percent';
  decimals?: number;
}

function formatValue(
  value: number,
  format: 'number' | 'percent',
  decimals: number
): string {
  return new Intl.NumberFormat('fr-FR', {
    style: format === 'percent' ? 'percent' : 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function ChartTranscription(props: Readonly<ChartTranscriptionProps>) {
  const { labels, data, type, format = 'number', decimals = 0 } = props;

  const items = match(type)
    .with('pie-chart', () => {
      const total = pipe(
        data,
        Array.reduce(0, (acc, v) => acc + v)
      );
      if (total === 0) return [];
      const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'percent',
        maximumFractionDigits: 0
      });
      return pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${formatter.format(value / total)}`)
      );
    })
    .with('bar-chart', () =>
      pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${formatValue(value, format, decimals)}`)
      )
    )
    .with('line-chart', () =>
      pipe(
        Array.zip(labels, data),
        Array.map(([label, value]) => `${label} : ${formatValue(value, format, decimals)}`)
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

export default ChartTranscription;

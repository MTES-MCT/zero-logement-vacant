import Accordion from '@codegouvfr/react-dsfr/Accordion';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { Array, pipe } from 'effect';
import { match } from 'ts-pattern';

interface ChartTranscriptionProps {
  labels: string[];
  data: number[];
  type: 'pie-chart' | 'bar-chart' | 'line-chart';
}

function ChartTranscription(props: Readonly<ChartTranscriptionProps>) {
  const { labels, data, type } = props;

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
    .with('line-chart', () =>
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

export default ChartTranscription;

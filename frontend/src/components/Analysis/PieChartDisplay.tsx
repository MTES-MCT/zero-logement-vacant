import '@gouvfr/dsfr-chart/PieChart';
import '@gouvfr/dsfr-chart/PieChart.css';
import type { PieChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

interface PieChartDisplayProps {
  chart: PieChartDataDTO;
  aspectRatio?: number;
}

function PieChartDisplay(props: Readonly<PieChartDisplayProps>) {
  const { chart, aspectRatio } = props;

  return (
    <>
      <pie-chart
        x={JSON.stringify([chart.labels])}
        y={JSON.stringify([chart.data])}
        name={JSON.stringify(chart.labels)}
        aspect-ratio={
          aspectRatio !== undefined ? String(aspectRatio) : undefined
        }
      />
      <ChartTranscription
        labels={chart.labels}
        data={chart.data}
        type="pie-chart"
      />
    </>
  );
}

export default PieChartDisplay;

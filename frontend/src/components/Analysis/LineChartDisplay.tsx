import '@gouvfr/dsfr-chart/LineChart';
import '@gouvfr/dsfr-chart/LineChart.css';
import type { LineChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

interface LineChartDisplayProps {
  chart: LineChartDataDTO;
  aspectRatio?: number;
}

function LineChartDisplay(props: Readonly<LineChartDisplayProps>) {
  const { chart, aspectRatio } = props;
  // Percent values cross the wire as 0–1 fractions (matching the scalar
  // percentage convention). The chart axis needs them scaled back up to be
  // meaningful, since DSFR LineChart plots raw numbers.
  const yValues =
    chart.format === 'percent' ? chart.data.map((v) => v * 100) : chart.data;

  return (
    <>
      <line-chart
        x={JSON.stringify([chart.labels])}
        y={JSON.stringify([yValues])}
        name={JSON.stringify([chart.name])}
        aspect-ratio={
          aspectRatio !== undefined ? String(aspectRatio) : undefined
        }
      />
      <ChartTranscription
        labels={chart.labels}
        data={chart.data}
        type="line-chart"
        format={chart.format}
        decimals={chart.decimals}
      />
    </>
  );
}

export default LineChartDisplay;

import '@gouvfr/dsfr-chart/LineChart';
import '@gouvfr/dsfr-chart/LineChart.css';

import type { LineChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

interface LineChartDisplayProps {
  chart: LineChartDataDTO;
}

function LineChartDisplay(props: Readonly<LineChartDisplayProps>) {
  const { chart } = props;

  return (
    <>
      <line-chart
        x={JSON.stringify([chart.labels])}
        y={JSON.stringify([chart.data])}
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

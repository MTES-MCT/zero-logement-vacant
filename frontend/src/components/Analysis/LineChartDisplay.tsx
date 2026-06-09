import { LineChart } from '@codegouvfr/react-dsfr/Chart/LineChart';
import type { LineChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

interface LineChartDisplayProps {
  chart: LineChartDataDTO;
}

function LineChartDisplay(props: Readonly<LineChartDisplayProps>) {
  const { chart } = props;

  return (
    <>
      <LineChart x={chart.labels} y={chart.data} color="blue-france" />
      <ChartTranscription
        labels={chart.labels}
        data={chart.data}
        type="line-chart"
      />
    </>
  );
}

export default LineChartDisplay;

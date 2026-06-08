import { PieChart } from '@codegouvfr/react-dsfr/Chart/PieChart';
import type { PieChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

interface PieChartDisplayProps {
  chart: PieChartDataDTO;
}

function PieChartDisplay(props: Readonly<PieChartDisplayProps>) {
  const { chart } = props;

  return (
    <>
      <PieChart
        x={chart.labels}
        y={chart.data}
        name={chart.labels}
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
        labels={chart.labels}
        data={chart.data}
        type="pie-chart"
      />
    </>
  );
}

export default PieChartDisplay;

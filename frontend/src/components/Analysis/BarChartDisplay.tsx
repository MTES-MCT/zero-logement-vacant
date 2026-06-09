import { BarChart } from '@codegouvfr/react-dsfr/Chart/BarChart';
import { styled } from '@mui/material/styles';
import type { BarChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

const NoLegend = styled('div')({
  '& .flex:has(.legende_dot)': {
    display: 'none',
  },
});

interface BarChartDisplayProps {
  chart: BarChartDataDTO;
}

function BarChartDisplay(props: Readonly<BarChartDisplayProps>) {
  const { chart } = props;

  return (
    <>
      <NoLegend>
        <BarChart
          x={[chart.labels]}
          y={[chart.data]}
          horizontal={chart.direction === 'horizontal'}
          color={['blue-france']}
        />
      </NoLegend>
      <ChartTranscription
        labels={chart.labels}
        data={chart.data}
        type="bar-chart"
        format={chart.format}
        decimals={chart.decimals}
      />
    </>
  );
}

export default BarChartDisplay;

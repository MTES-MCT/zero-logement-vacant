import '@gouvfr/dsfr-chart/BarChart';
import '@gouvfr/dsfr-chart/BarChart.css';

import { styled } from '@mui/material/styles';
import type { BarChartDataDTO } from '@zerologementvacant/models';

import ChartTranscription from './ChartTranscription';

const NoLegend = styled('div')({
  '& .flex:has(.legende_dot)': {
    display: 'none'
  }
});

interface BarChartDisplayProps {
  chart: BarChartDataDTO;
}

function BarChartDisplay(props: Readonly<BarChartDisplayProps>) {
  const { chart } = props;
  const horizontal = chart.direction === 'horizontal';

  return (
    <>
      <NoLegend>
        <bar-chart
          x={JSON.stringify([chart.labels])}
          y={JSON.stringify([chart.data])}
          horizontal={horizontal ? 'true' : undefined}
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

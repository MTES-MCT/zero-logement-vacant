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
  // Percent values cross the wire as 0–1 fractions (matching the scalar
  // percentage convention). The chart axis needs them scaled back up to be
  // meaningful, since DSFR BarChart plots raw numbers.
  const yValues =
    chart.format === 'percent' ? chart.data.map((v) => v * 100) : chart.data;

  return (
    <>
      <NoLegend>
        <bar-chart
          x={JSON.stringify([chart.labels])}
          y={JSON.stringify([yValues])}
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

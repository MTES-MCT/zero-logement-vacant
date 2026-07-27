import { Image } from '@react-pdf/renderer';
import { ArcElement, Chart, Legend, PieController } from 'chart.js';

import { useCanvas } from './CanvasContext.js';

Chart.register(PieController, ArcElement, Legend);

export interface PieChartSlice {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartSlice[];
  width?: number;
  height?: number;
}

export function PieChart({
  data,
  width = 500,
  height = 500
}: Readonly<PieChartProps>) {
  const { createCanvas } = useCanvas();

  async function createImage(): Promise<string> {
    const { canvas, toDataURL } = createCanvas(width, height);
    const chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: data.map((slice) => `${slice.label} (${slice.value})`),
        datasets: [
          {
            data: data.map((slice) => slice.value),
            backgroundColor: data.map((slice) => slice.color)
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        borderColor: 'transparent'
      }
    });

    const dataURL = await toDataURL();
    chart.destroy();
    return dataURL;
  }

  return <Image src={createImage} style={{ width, height, aspectRatio: 1 }} />;
}

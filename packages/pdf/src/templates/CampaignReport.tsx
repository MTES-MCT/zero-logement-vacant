import { fr } from '@codegouvfr/react-dsfr';
import { Document, Page } from '@react-pdf/renderer';
import {
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  type HousingDTO
} from '@zerologementvacant/models';
import type { ReactNode } from 'react';

import {
  PieChart,
  Stack,
  StaticMap,
  StaticMapMarker,
  Typography,
  type PieChartSlice
} from '~/browser.js';

const colors = fr.colors.getHex({ isDark: false }).decisions.background;

const HOUSING_STATUS_COLORS: Record<number, string> = {
  [HOUSING_STATUS_VALUES[0]]: '#5C68E5',
  [HOUSING_STATUS_VALUES[1]]: '#B478F1',
  [HOUSING_STATUS_VALUES[2]]: '#31A7AE',
  [HOUSING_STATUS_VALUES[3]]: '#29598F',
  [HOUSING_STATUS_VALUES[4]]: '#82B5F2',
  [HOUSING_STATUS_VALUES[5]]: colors.contrast.purpleGlycine.default
};

export interface CampaignReportDocumentProps {
  children: ReactNode;
}

export function CampaignReportDocument(
  props: Readonly<CampaignReportDocumentProps>
) {
  return (
    <Document author="Zéro Logement Vacant" language="fr">
      {props.children}
    </Document>
  );
}

export interface CampaignReportPageProps {
  housings: ReadonlyArray<HousingDTO>;
}

function HousingKindPieChart(props: Readonly<CampaignReportPageProps>) {
  const data = HOUSING_KIND_VALUES.map<PieChartSlice>((kind) => ({
    label: kind,
    value: props.housings.filter((housing) => housing.housingKind === kind)
      .length,
    color: kind === 'APPART' ? '#5C68E5' : '#B478F1'
  }));

  return <PieChart data={data} />;
}

export function CampaignReportPage(props: Readonly<CampaignReportPageProps>) {
  const byStatus = HOUSING_STATUS_VALUES.map((status) => ({
    label: HOUSING_STATUS_LABELS[status],
    value: props.housings.filter((housing) => housing.status === status).length,
    color: HOUSING_STATUS_COLORS[status]
  }));

  const markers = props.housings.map<StaticMapMarker>((housing) => ({
    latitude: housing.latitude,
    longitude: housing.longitude
  }));

  return (
    <Page size="A4" orientation="landscape">
      <Stack direction="row">
        <Stack direction="column" style={{ flex: '1 0 33%' }}>
          <Typography>Column 33%</Typography>
          <StaticMap size={256} markers={markers} />
        </Stack>
        <Stack direction="column" style={{ flex: '1 0 66%' }}>
          <Stack direction="row">
            <HousingKindPieChart housings={props.housings} />
            <PieChart data={byStatus} />
          </Stack>
        </Stack>
      </Stack>
    </Page>
  );
}

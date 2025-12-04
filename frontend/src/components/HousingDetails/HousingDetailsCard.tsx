import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import Skeleton from '@mui/material/Skeleton';

import { type Housing } from '~/models/Housing';
import DocumentsTab from './DocumentsTab';
import HistoryTab from './HistoryTab';
import HousingTab from './HousingTab';
import MobilizationTab from './MobilizationTab';

interface HousingDetailsCardProps {
  housing: Housing | undefined;
}

function HousingDetailsCard(props: HousingDetailsCardProps) {
  const uploadDocsEnabled = useFeatureFlagEnabled('upload-docs');

  if (!props.housing) {
    return (
      <Skeleton
        animation="wave"
        variant="rectangular"
        width="100%"
        height="60rem"
      />
    );
  }

  if (!uploadDocsEnabled) {
    return (
      <Tabs
        tabs={[
          {
            label: 'Logement et bâtiment',
            content: <HousingTab housing={props.housing} />,
            isDefault: true
          },
          {
            label: 'Suivi',
            content: <MobilizationTab housing={props.housing} />
          },
          {
            label: 'Notes et historique',
            content: <HistoryTab housing={props.housing} />
          }
        ]}
      />
    );
  }

  return (
    <Tabs
      tabs={[
        {
          label: 'Logement et bâtiment',
          content: <HousingTab housing={props.housing} />,
          isDefault: true
        },
        {
          label: 'Suivi',
          content: <MobilizationTab housing={props.housing} />
        },
        {
          label: 'Documents',
          content: <DocumentsTab housing={props.housing} />
        },
        {
          label: 'Notes et historique',
          content: <HistoryTab housing={props.housing} />
        }
      ]}
    />
  );
}

export default HousingDetailsCard;

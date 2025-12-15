import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import Skeleton from '@mui/material/Skeleton';

import { useHousing } from '~/hooks/useHousing';
import DocumentsTab from './DocumentsTab';
import HistoryTab from './HistoryTab';
import HousingTab from './HousingTab';
import MobilizationTab from './MobilizationTab';

function HousingDetailsCard() {
  const { housing } = useHousing();
  const uploadDocsEnabled = useFeatureFlagEnabled('upload-docs');

  if (!housing) {
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
            content: <HousingTab />,
            isDefault: true
          },
          {
            label: 'Suivi',
            content: <MobilizationTab />
          },
          {
            label: 'Notes et historique',
            content: <HistoryTab />
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
          content: <HousingTab />,
          isDefault: true
        },
        {
          label: 'Suivi',
          content: <MobilizationTab />
        },
        {
          label: 'Documents',
          content: <DocumentsTab />
        },
        {
          label: 'Notes et historique',
          content: <HistoryTab />
        }
      ]}
    />
  );
}

export default HousingDetailsCard;

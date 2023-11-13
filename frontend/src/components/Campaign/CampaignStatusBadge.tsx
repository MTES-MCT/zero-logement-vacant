import React from 'react';
import AppBadge from '../_app/AppBadge/AppBadge';
import { CampaignSteps } from '../../models/Campaign';

interface Props {
  step: CampaignSteps;
}

const CampaignStatusBadge = ({ step }: Props) => {
  return (
    <AppBadge
      colorFamily={
        step < CampaignSteps.InProgress
          ? 'yellow-tournesol'
          : step < CampaignSteps.Archived
          ? 'green-bourgeon'
          : 'blue-cumulus'
      }
    >
      {step < CampaignSteps.InProgress
        ? 'En attente d’envoi'
        : step < CampaignSteps.Archived
        ? 'Envoyée'
        : 'Archivée'}
    </AppBadge>
  );
};

export default CampaignStatusBadge;

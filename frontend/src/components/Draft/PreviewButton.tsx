import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

import config from '../../utils/config';
import authService from '../../services/auth.service';
import { Draft } from '../../models/Draft';
import { useHousingList } from '../../hooks/useHousingList';
import { useCampaign } from '../../hooks/useCampaign';
import { toast } from 'react-toastify';

interface Props {
  className?: string;
  disabled?: boolean;
  draft?: Draft;
}

function PreviewButton(props: Readonly<Props>) {
  const [isLoading, setIsLoading] = useState(false);
  const { campaign, isLoadingCampaign } = useCampaign();
  const { housingList: houses } = useHousingList(
    {
      filters: {
        campaignIds: [campaign!.id],
      },
      pagination: {
        paginate: true,
        page: 1,
        perPage: 1,
      },
    },
    { skip: isLoadingCampaign || !campaign }
  );

  async function preview(): Promise<void> {
    try {
      if (!houses?.length) {
        toast.error('Aucun logement trouvé pour cette campagne');
        return;
      }

      if (props.draft) {
        setIsLoading(true);
        const response = await fetch(
          `${config.apiEndpoint}/api/drafts/${props.draft.id}/preview`,
          {
            method: 'POST',
            headers: {
              ...authService.authHeader(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              housing: houses[0],
              owner: houses[0].owner,
            }),
          }
        );
        const blob = await response.blob();
        if (response.ok) {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      className={props.className}
      disabled={props.disabled || isLoading}
      iconId="fr-icon-eye-line"
      priority="secondary"
      onClick={preview}
    >
      Visualiser mon courrier
    </Button>
  );
}

export default PreviewButton;

import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';
import { toast } from 'react-toastify';

import config from '../../utils/config';
import authService from '../../services/auth.service';
import { Draft } from '../../models/Draft';
import { useHousingList } from '../../hooks/useHousingList';
import { useCampaign } from '../../hooks/useCampaign';
import { useNotification } from '../../hooks/useNotification';
import { getAddress } from '../../models/Owner';

interface Props {
  className?: string;
  disabled?: boolean;
  draft?: Draft;
}

function PreviewButton(props: Readonly<Props>) {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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

  useNotification({
    isError,
    isLoading,
    isSuccess,
    message: {
      error: 'Une erreur est survenue lors de la génération du courrier.',
      loading:
        'Votre courrier est en cours de génération, veuillez patienter quelques secondes...',
      success: 'Courrier généré !',
    },
    toastId: 'preview-draft',
  });

  async function preview(): Promise<void> {
    try {
      setIsError(false);
      setIsLoading(true);
      setIsSuccess(false);

      if (!houses?.length) {
        toast.error('Aucun logement trouvé pour cette campagne');
        return;
      }

      if (props.draft) {
        setIsLoading(true);
        const [housing] = houses;
        const { owner } = housing;
        const response = await fetch(
          `${config.apiEndpoint}/api/drafts/${props.draft.id}/preview`,
          {
            method: 'POST',
            headers: {
              ...authService.authHeader(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              housing: housing,
              owner: {
                fullName: owner.fullName,
                address: getAddress(owner),
              },
            }),
          }
        );
        const blob = await response.blob();
        if (response.ok) {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setIsSuccess(true);
        }
      }
    } catch (error) {
      setIsError(true);
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

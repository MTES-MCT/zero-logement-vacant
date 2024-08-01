import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';
import { toast } from 'react-toastify';

import config from '../../utils/config';
import authService from '../../services/auth.service';
import { Draft, DraftPreviewPayload } from '../../models/Draft';
import { useCampaign } from '../../hooks/useCampaign';
import { useNotification } from '../../hooks/useNotification';
import { toOwnerDTO } from '../../models/Owner';
import { useLazyFindHousingQuery } from '../../services/housing.service';
import { toHousingDTO } from '../../models/Housing';

interface Props {
  className?: string;
  disabled?: boolean;
  draft?: Draft;
}

function PreviewButton(props: Readonly<Props>) {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { campaign } = useCampaign();

  const [findHousings] = useLazyFindHousingQuery();

  useNotification({
    isError,
    isLoading,
    isSuccess,
    message: {
      error: 'Une erreur est survenue lors de la génération du courrier.',
      loading:
        'Votre courrier est en cours de génération, veuillez patienter quelques secondes...',
      success: 'Courrier généré !'
    },
    toastId: 'preview-draft'
  });

  async function preview(): Promise<void> {
    try {
      setIsError(false);
      setIsLoading(true);
      setIsSuccess(false);

      const { data } = await findHousings({
        filters: {
          campaignIds: [campaign!.id]
        },
        pagination: {
          paginate: true,
          page: 1,
          perPage: 1
        }
      });
      const housings = data?.entities;

      if (!housings?.length) {
        toast.error('Aucun logement trouvé pour cette campagne');
        return;
      }

      if (props.draft) {
        setIsLoading(true);
        const [housing] = housings;
        const { owner } = housing;
        const payload: DraftPreviewPayload = {
          housing: toHousingDTO(housing),
          owner: toOwnerDTO(owner)
        };
        const response = await fetch(
          `${config.apiEndpoint}/api/drafts/${props.draft.id}/preview`,
          {
            method: 'POST',
            headers: {
              ...authService.authHeader(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
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
      Visualiser mon brouillon
    </Button>
  );
}

export default PreviewButton;

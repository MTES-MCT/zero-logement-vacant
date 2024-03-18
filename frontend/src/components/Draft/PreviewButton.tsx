import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

import config from '../../utils/config';
import authService from '../../services/auth.service';
import { Draft } from '../../models/Draft';

interface Props {
  draft: Draft;
}

function PreviewButton(props: Readonly<Props>) {
  const [isLoading, setIsLoading] = useState(false);

  async function preview(): Promise<void> {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${config.apiEndpoint}/api/drafts/${props.draft.id}/preview`,
        {
          headers: {
            ...authService.authHeader(),
          },
        }
      );
      const blob = await response.blob();
      if (response.ok) {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      disabled={isLoading}
      iconId="fr-icon-eye-line"
      priority="secondary"
      onClick={preview}
    >
      Visualiser mon courrier
    </Button>
  );
}

export default PreviewButton;

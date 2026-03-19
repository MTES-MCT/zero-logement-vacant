import Button from '@codegouvfr/react-dsfr/Button';
import type { CampaignDTO } from '@zerologementvacant/models';
import { useNotification } from '~/hooks/useNotification';
import { useExportCampaignMutation } from '~/services/export.service';

export interface DraftDownloaderButtonProps {
  campaign: Pick<CampaignDTO, 'id' | 'title'>;
}

function DraftDownloaderButton(props: Readonly<DraftDownloaderButtonProps>) {
  const [exportCampaign, exportCampaignMutation] = useExportCampaignMutation();

  async function download() {
    const url = await exportCampaign({ id: props.campaign.id }).unwrap();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.campaign.title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useNotification({
    toastId: 'export-campaign',
    isError: exportCampaignMutation.isError,
    isLoading: exportCampaignMutation.isLoading,
    isSuccess: exportCampaignMutation.isSuccess,
    message: {
      error: 'Une erreur est survenue lors de l’export des courriers',
      loading: 'Export des courriers...',
      success: 'Courriers exportés !'
    }
  });

  return (
    <Button
      disabled={exportCampaignMutation.isLoading}
      priority="primary"
      type="button"
      iconId="ri-download-2-fill"
      onClick={download}
    >
      Télécharger les courriers
    </Button>
  );
}

export default DraftDownloaderButton;

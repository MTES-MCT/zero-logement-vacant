import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { FormEvent, useState } from 'react';

import { Campaign } from '../../models/Campaign';
import { Col, Container, Row } from '../../components/_dsfr';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import { useCampaign } from '../../hooks/useCampaign';
import DraftSendingDate, {
  sentAtSchema,
} from '../../components/Draft/DraftSendingDate';
import { useForm } from '../../hooks/useForm';
import { object } from 'yup';
import Button from '@codegouvfr/react-dsfr/Button';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import { useNotification } from '../../hooks/useNotification';

const schema = object({
  sentAt: sentAtSchema,
});

interface Props {
  campaign: Campaign;
}

function CampaignSending(props: Props) {
  const [sentAt, setSentAt] = useState('');
  const { count } = useCampaign();
  const [updateCampaign, mutation] = useUpdateCampaignMutation();

  const form = useForm(schema, {
    sentAt,
  });

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'update-sending-date',
  });

  const disabled = false;

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.validate(() => {
      updateCampaign({
        ...props.campaign,
        sentAt,
        status: 'in-progress',
      });
    });
  }

  return (
    <Container as="article" fluid>
      <Container as="header" fluid spacing="mb-5w">
        <CampaignTitle as="h2" campaign={props.campaign} className="fr-mb-1w" />
        <CampaignCounts
          display="row"
          housing={count?.housing}
          owners={count?.owners}
        />
      </Container>
      <Container as="section" fluid spacing="mb-5w">
        {disabled ? (
          <Alert
            className="fr-mb-5w"
            closable
            description="Vous pouvez quitter cette page et revenir télécharger vos courriers ici dès que le fichier sera prêt. Si vous n'avez toujours pas accès au téléchargement après 24 heures, contactez-nous via le chat en bas à droite de la page."
            severity="info"
            title="Chargement de vos courriers en cours"
          />
        ) : null}
        <Row>
          <Col n="3">
            <form onSubmit={submit}>
              <DraftSendingDate
                className="fr-mb-5w"
                disabled={disabled}
                form={form}
                value={sentAt}
                onChange={setSentAt}
              />
              <Button disabled={disabled} priority="primary">
                Confirmer et passer au suivi
              </Button>
            </form>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

export default CampaignSending;

import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Grid from '@mui/material/Unstable_Grid2';

import conclusion from '../../assets/images/conclusion.svg';
import documentDownload from '../../assets/images/document-download.svg';

import GroupOrCampaignCard from './GroupOrCampaignCard';

interface GroupOrCampaignCreationModalProps {
  onGroup(): void;
}

function createGroupOrCampaignCreationModal() {
  const modal = createModal({
    id: 'group-or-campaign-creation-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: GroupOrCampaignCreationModalProps) {
      return (
        <modal.Component size="extra-large" title="Que souhaitez-vous faire ?">
          <Grid
            container
            spacing={2}
            sx={{
              alignItems: 'stretch',
              justifyContent: 'stretch'
            }}
          >
            <Grid xs={6}>
              <GroupOrCampaignCard
                title="Analyser et exporter une liste de logements"
                description="Un groupe vous permet de créer une liste de logements que vous pourrez analyser ou exporter au format excel."
                image={documentDownload}
                button="Ajouter dans un groupe"
                buttonProps={{
                  onClick: () => {
                    props.onGroup();
                  }
                }}
              />
            </Grid>

            <Grid xs={6}>
              <GroupOrCampaignCard
                title="Contacter les propriétaires"
                description="Une campagne vous permet d'accéder à la liste des destinataires, de rédiger votre courrier et d'enregistrer vos prises de contact avec les propriétaires."
                image={conclusion}
                button="Créer une campagne"
              />
            </Grid>
          </Grid>
        </modal.Component>
      );
    }
  };
}

export default createGroupOrCampaignCreationModal;

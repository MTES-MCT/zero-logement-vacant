import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

import type { HousingCountDTO } from '@zerologementvacant/models';
import conclusion from '../../assets/images/conclusion.svg';
import documentDownload from '../../assets/images/document-download.svg';
import GroupOrCampaignCard from './GroupOrCampaignCard';
import { createExtendedModal } from '../modals/ConfirmationModal/ExtendedModal';
import HousingCount from '../HousingCount/HousingCount';

interface GroupOrCampaignCreationModalProps {
  count?: HousingCountDTO;
  isCounting: boolean;
  onCampaign(): void;
  onGroup(): void;
}

function createGroupOrCampaignCreationModal() {
  const options = {
    id: 'group-or-campaign-creation-modal',
    isOpenedByDefault: false
  };
  const modal = createExtendedModal(options);

  return {
    ...modal,
    Component(props: GroupOrCampaignCreationModalProps) {
      return (
        <modal.Component size="extra-large" title="Que souhaitez-vous faire ?">
          <Grid
            container
            columnSpacing={2}
            sx={{
              alignItems: 'stretch',
              justifyContent: 'stretch'
            }}
          >
            <Grid sx={{ mt: -1, mb: 2 }} size={12}>
              {props.isCounting && (
                <Skeleton animation="wave" height="1.5rem" width="20rem" />
              )}
              {props.count && (
                <HousingCount
                  housingCount={props.count.housing}
                  ownerCount={props.count.owners}
                  suffix
                />
              )}
            </Grid>

            <Grid size={6}>
              <GroupOrCampaignCard
                title={
                  <>
                    Analyser et exporter
                    <br />
                    une liste de logements
                  </>
                }
                description="Un groupe vous permet de créer une liste de logements que vous pourrez analyser ou exporter au format excel."
                image={documentDownload}
                button="Ajouter dans un groupe"
                buttonProps={{
                  onClick() {
                    props.onGroup();
                  }
                }}
              />
            </Grid>

            <Grid size={6}>
              <GroupOrCampaignCard
                title="Contacter les propriétaires"
                description="Une campagne vous permet d'accéder à la liste des destinataires, de rédiger votre courrier et d'enregistrer vos prises de contact avec les propriétaires."
                image={conclusion}
                button="Créer une campagne"
                buttonProps={{
                  onClick() {
                    props.onCampaign();
                  }
                }}
              />
            </Grid>
          </Grid>
        </modal.Component>
      );
    }
  };
}

export default createGroupOrCampaignCreationModal;

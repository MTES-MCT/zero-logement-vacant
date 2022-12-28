import React, { ChangeEvent, useState } from 'react';
import {
  Button,
  Col,
  Container,
  Modal,
  ModalContent,
  ModalFooter,
  ModalTitle,
  Row,
  Text,
  TextInput,
} from '@dataesr/react-dsfr';
import HousingFiltersBadges from '../../HousingFiltersBadges/HousingFiltersBadges';

import * as yup from 'yup';
import { hasFilters, HousingFilters } from '../../../models/HousingFilters';
import { displayCount } from '../../../utils/stringUtils';
import { campaignTitleValidator, useForm } from '../../../hooks/useForm';

interface Props {
  housingCount: number;
  housingExcudedCount?: number;
  filters: HousingFilters;
  onSubmit: (campaignTitle?: string) => void;
  onClose: () => void;
  isReminder?: boolean;
}

const CampaignCreationModal = ({
  housingCount,
  housingExcudedCount,
  filters,
  onSubmit,
  onClose,
  isReminder,
}: Props) => {
  const [campaignTitle, setCampaignTitle] = useState('');
  const schema = yup.object().shape(
    isReminder
      ? {}
      : {
          campaignTitle: campaignTitleValidator,
        }
  );
  const { isValid, message, messageType, validate } = useForm(
    schema,
    isReminder
      ? {}
      : {
          campaignTitle,
        },
    isReminder ? { dependencies: [isReminder] } : undefined
  );

  const create = () => {
    validate().then(() => {
      if (isValid()) {
        onSubmit(campaignTitle);
      }
    });
  };

  return (
    <Modal
      isOpen={true}
      hide={() => onClose()}
      size="lg"
      data-testid="campaign-creation-modal"
    >
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        {isReminder ? 'Créer la campagne de relance' : 'Créer la campagne'}
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          <Text size="md">
            <span data-testid="housing-infos">
              Vous êtes sur le point de créer une campagne comportant{' '}
              <b>{displayCount(housingCount, 'logement')}.</b>
            </span>
          </Text>
          {!isReminder && (
            <Row gutters>
              <Col n="6">
                <TextInput
                  value={campaignTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCampaignTitle(e.target.value)
                  }
                  label="Titre de la campagne"
                  placeholder="Titre de la campagne"
                  message={message('campaignTitle')}
                  messageType={messageType('campaignTitle')}
                  required
                  data-testid="campaign-title-input"
                />
              </Col>
            </Row>
          )}
          <Row className="fr-mt-4w">
            <Col>
              {hasFilters(filters) ? (
                <>
                  La liste a été établie à partir des filtres suivants :
                  <div className="fr-my-1w">
                    <HousingFiltersBadges filters={filters} />
                  </div>
                </>
              ) : (
                <div>La liste a été établie sans filtres.</div>
              )}
              {housingExcudedCount !== undefined && housingExcudedCount > 0 && (
                <>
                  {housingExcudedCount === 1 ? (
                    <i>
                      Un logement a été retiré des résultats de la recherche
                      {hasFilters(filters) && <> avec ces filtres</>}.
                    </i>
                  ) : (
                    <i>
                      {housingExcudedCount} logements ont été retirés des
                      résultats de la recherche
                      {hasFilters(filters) && <> avec ces filtres</>}.
                    </i>
                  )}
                </>
              )}
            </Col>
          </Row>
        </Container>
      </ModalContent>
      <ModalFooter>
        <Container>
          <Row>
            <Col className="align-right">
              <Button
                title="Annuler"
                secondary
                className="fr-mr-2w"
                onClick={() => onClose()}
              >
                Annuler
              </Button>
              <Button
                title="Enregistrer"
                onClick={() => create()}
                data-testid="create-button"
              >
                Enregistrer
              </Button>
            </Col>
          </Row>
        </Container>
      </ModalFooter>
    </Modal>
  );
};

export default CampaignCreationModal;

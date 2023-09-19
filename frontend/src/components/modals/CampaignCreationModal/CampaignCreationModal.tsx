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
} from '@dataesr/react-dsfr';
import HousingFiltersBadges from '../../HousingFiltersBadges/HousingFiltersBadges';

import * as yup from 'yup';
import { hasFilters, HousingFilters } from '../../../models/HousingFilters';
import { displayCount } from '../../../utils/stringUtils';
import { campaignTitleValidator, useForm } from '../../../hooks/useForm';
import AppTextInput from '../../AppTextInput/AppTextInput';

interface Props {
  open: boolean;
  housingCount: number;
  housingExcudedCount?: number;
  filters: HousingFilters;
  onSubmit: (campaignTitle?: string) => void;
  onClose: () => void;
  isReminder?: boolean;
}

const CampaignCreationModal = ({
  open,
  housingCount,
  housingExcudedCount,
  filters,
  onSubmit,
  onClose,
  isReminder,
}: Props) => {
  const [campaignTitle, setCampaignTitle] = useState('');
  const shape = {
    campaignTitle: isReminder
      ? yup.string().nullable()
      : campaignTitleValidator,
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    campaignTitle,
  });

  const create = async () => {
    await form.validate(() => onSubmit(campaignTitle));
  };

  return (
    <Modal
      isOpen={open}
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
                <AppTextInput<FormShape>
                  value={campaignTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCampaignTitle(e.target.value)
                  }
                  label="Titre de la campagne"
                  placeholder="Titre de la campagne (obligatoire)"
                  inputForm={form}
                  inputKey="campaignTitle"
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
        <Container as="section">
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

import React, { useState } from 'react';
import { Col, Container, Row, Text } from '../../_dsfr';
import HousingFiltersBadges from '../../HousingFiltersBadges/HousingFiltersBadges';

import * as yup from 'yup';
import { hasFilters, HousingFilters } from '../../../models/HousingFilters';
import { displayCount } from '../../../utils/stringUtils';
import { campaignTitleValidator, useForm } from '../../../hooks/useForm';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';

const modal = createModal({
  id: 'campaign-creation-modal',
  isOpenedByDefault: true,
});

interface Props {
  housingCount: number;
  housingExcludedCount?: number;
  filters: HousingFilters;
  openingButtonProps: Omit<ButtonProps, 'onClick'>;
  onSubmit: (campaignTitle?: string) => void;
  isReminder?: boolean;
}

const CampaignCreationModal = ({
  housingCount,
  housingExcludedCount,
  filters,
  openingButtonProps,
  onSubmit,
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
    <>
      <>
        {
          // @ts-ignore
          <Button
            {...openingButtonProps}
            onClick={modal.open}
            data-testid="create-campaign-button"
          >
            {openingButtonProps.children}
          </Button>
        }
      </>
      <modal.Component
        size="large"
        title={
          <>
            <span className="fr-icon-1x icon-left fr-icon-arrow-right-line ds-fr--v-middle" />
            {isReminder ? 'Créer la campagne de relance' : 'Créer la campagne'}
          </>
        }
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
          },
          {
            children: 'Enregistrer',
            onClick: create,
            doClosesModal: false,
          },
        ]}
      >
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
                  onChange={(e) => setCampaignTitle(e.target.value)}
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
          {!isReminder && (
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
                {housingExcludedCount !== undefined &&
                  housingExcludedCount > 0 && (
                    <>
                      {housingExcludedCount === 1 ? (
                        <i>
                          Un logement a été retiré des résultats de la recherche
                          {hasFilters(filters) && <> avec ces filtres</>}.
                        </i>
                      ) : (
                        <i>
                          {housingExcludedCount} logements ont été retirés des
                          résultats de la recherche
                          {hasFilters(filters) && <> avec ces filtres</>}.
                        </i>
                      )}
                    </>
                  )}
              </Col>
            </Row>
          )}
        </Container>
      </modal.Component>
    </>
  );
};

export default CampaignCreationModal;

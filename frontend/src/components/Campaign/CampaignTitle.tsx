import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import classNames from 'classnames';
import React, { FormEvent, useState } from 'react';
import { InferType, object } from 'yup';

import { Col, Container, Row, Title } from '../_dsfr';
import { Campaign } from '../../models/Campaign';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import styles from './campaign.module.scss';
import { campaignTitleValidator, useForm } from '../../hooks/useForm';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import AppTextInput from '../_app/AppTextInput/AppTextInput';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const modal = createModal({
  id: 'campaign-title-modal',
  isOpenedByDefault: false,
});

const schema = object().shape({
  title: campaignTitleValidator,
});
type FormShape = InferType<typeof schema>;

interface Props {
  campaign: Campaign;
  className?: string;
  as?: TitleAs;
  look?: TitleAs;
}

function CampaignTitle({ campaign, className, as, look }: Readonly<Props>) {
  const { trackEvent } = useMatomo();

  const [updateCampaign] = useUpdateCampaignMutation();

  const [title, setTitle] = useState(campaign.title ?? '');
  const form = useForm(schema, {
    title,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    form.validate(async () => {
      await updateCampaign({
        ...campaign,
        title,
      });
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.Rename,
      });
      modal.close();
    });
  }

  return (
    <>
      <Container
        fluid
        as="section"
        className={classNames(styles.container, className)}
      >
        <Title
          as={as ?? 'h1'}
          look={look ?? as ?? 'h1'}
          className={styles.title}
        >
          {campaign.title}
        </Title>
        <Button
          iconId="fr-icon-edit-line"
          iconPosition="right"
          priority="tertiary no outline"
          size="small"
          onClick={modal.open}
        >
          Renommer
        </Button>
      </Container>
      <modal.Component
        title="Modifier le titre de la campagne"
        buttons={[
          {
            children: 'Annuler',
            className: 'fr-mr-2w',
            priority: 'secondary',
          },
          {
            onClick: submit,
            children: 'Confirmer',
            doClosesModal: false,
          },
        ]}
      >
        <form id="campaign-title-edition-form" onSubmit={submit}>
          <Container as="section" fluid>
            <Row gutters>
              <Col n="10">
                <AppTextInput<FormShape>
                  inputForm={form}
                  inputKey="title"
                  label="Nom de la campagne *"
                  required
                  value={title}
                  state={form.hasError('title') ? 'error' : 'default'}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Col>
            </Row>
          </Container>
        </form>
      </modal.Component>
    </>
  );
}

export default CampaignTitle;

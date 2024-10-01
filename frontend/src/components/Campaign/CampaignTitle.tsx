import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import classNames from 'classnames';
import { FormEvent, useState } from 'react';
import { InferType, object } from 'yup';

import { Col, Container, Row } from '../_dsfr';
import { Campaign } from '../../models/Campaign';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import styles from './campaign.module.scss';
import { campaignTitleValidator, campaignDescriptionValidator, useForm } from '../../hooks/useForm';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import Typography from '@mui/material/Typography';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const modal = createModal({
  id: 'campaign-title-modal',
  isOpenedByDefault: false
});

const schema = object().shape({
  title: campaignTitleValidator,
  description: campaignDescriptionValidator
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

  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const form = useForm(schema, {
    title,
    description
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    form.validate(async () => {
      await updateCampaign({
        ...campaign,
        title,
        description,
      }).unwrap();
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.Rename
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
        <Typography
          component={as ?? 'h1'}
          variant={look ?? as ?? 'h1'}
          className={styles.title}
        >
          {campaign.title}
        </Typography>
        <Button
          iconId="fr-icon-edit-line"
          iconPosition="right"
          priority="tertiary no outline"
          size="small"
          onClick={modal.open}
        >
          Modifier le nom
        </Button>
      </Container>
      <modal.Component
        title="Modifier le titre de la campagne"
        buttons={[
          {
            children: 'Annuler',
            className: 'fr-mr-2w',
            priority: 'secondary'
          },
          {
            onClick: submit,
            children: 'Confirmer',
            doClosesModal: false
          }
        ]}
      >
        <form id="campaign-title-edition-form" onSubmit={submit}>
          <Container as="section" fluid>
            <Row gutters>
              <Col n="10">
                <AppTextInput<FormShape>
                  inputForm={form}
                  inputKey="title"
                  label="Titre de la campagne"
                  placeholder="Titre de la campagne (obligatoire)"
                  required
                  value={title}
                  state={form.hasError('title') ? 'error' : 'default'}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Col>
            </Row>
            <Row gutters>
              <Col n="10">
                <AppTextInput<FormShape>
                  textArea
                  inputForm={form}
                  inputKey="description"
                  label="Description de la campagne"
                  value={description}
                  state={form.hasError('description') ? 'error' : 'default'}
                  onChange={(e) => { setDescription(e.target.value); }}
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

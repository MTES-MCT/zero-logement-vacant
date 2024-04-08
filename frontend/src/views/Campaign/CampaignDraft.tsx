import fp from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import * as yup from 'yup';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody from '../../components/Draft/DraftBody';
import { Campaign } from '../../models/Campaign';
import { DraftCreationPayloadDTO } from '../../../../shared/models/DraftDTO';
import { Col, Container, Row } from '../../components/_dsfr';
import {
  useCreateDraftMutation,
  useUpdateDraftMutation,
} from '../../services/draft.service';
import UnsavedChanges from '../../components/UnsavedChanges/UnsavedChanges';
import PreviewButton from '../../components/Draft/PreviewButton';
import styles from './campaign.module.scss';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import DraftSender, { senderSchema } from '../../components/Draft/DraftSender';
import { SenderPayload } from '../../models/Sender';
import SendButton from '../../components/Draft/SendButton';
import SaveButton from '../../components/SaveButton/SaveButton';

const schema = yup.object({
  body: yup.string(),
  sender: senderSchema,
});

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Props) {
  const { count, draft, isLoadingDraft } = useCampaign();

  useDocumentTitle(props.campaign.title);

  const [values, setValues] = useState<DraftCreationPayloadDTO>({
    body: '',
    campaign: '',
    sender: {
      name: '',
      service: '',
      firstName: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (draft) {
      setValues({
        body: draft.body,
        sender: draft.sender,
        campaign: props.campaign.id,
      });
    }
  }, [draft, props.campaign.id]);

  const form = useForm(schema, values);

  const [createDraft, createDraftMutation] = useCreateDraftMutation();
  function create(): void {
    if (!draft) {
      form.validate(() => {
        createDraft({ ...values, campaign: props.campaign.id });
      });
    }
  }

  const [updateDraft, updateDraftMutation] = useUpdateDraftMutation();
  function update(): void {
    if (draft) {
      form.validate(() => {
        updateDraft({ ...values, id: draft.id });
      });
    }
  }

  const exists = !!draft;
  const [save, mutation] = exists
    ? [update, updateDraftMutation]
    : [create, createDraftMutation];

  if (isLoadingDraft) {
    return <Loading />;
  }

  if (!values) {
    return <Loading />;
  }

  const hasChanges = form.isDirty && !fp.equals(draft, values);

  function setBody(body: string): void {
    setValues({
      body,
      campaign: props.campaign.id,
      sender: values.sender,
    });
  }

  function setSender(sender: SenderPayload): void {
    setValues({ ...values, sender });
  }

  return (
    <Container as="article" fluid>
      <Container as="header" fluid>
        <Row>
          <Col n="6">
            <CampaignTitle
              as="h2"
              campaign={props.campaign}
              className="fr-mb-1w"
            />
            <CampaignCounts
              display="row"
              housing={count?.housing}
              owners={count?.owners}
            />
          </Col>
          <Col n="6" className={styles.right}>
            <PreviewButton
              className="fr-mr-2w"
              disabled={!exists}
              draft={draft}
            />
            <SendButton campaign={props.campaign} />
          </Col>
        </Row>
      </Container>
      <form id="draft" name="draft" className="fr-mt-2w">
        <UnsavedChanges when={hasChanges} />
        <Container as="section" fluid>
          <Row justifyContent="right" spacing="mb-2w">
            <SaveButton
              isError={mutation.isError}
              isLoading={mutation.isLoading}
              isSuccess={mutation.isSuccess}
              onSave={save}
            />
          </Row>
          <Row spacing="mb-2w">
            <Col n="7" offset="5">
              <DraftSender
                form={form}
                value={values.sender}
                onChange={setSender}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <DraftBody form={form} value={values.body} onChange={setBody} />
            </Col>
          </Row>
        </Container>
      </form>
    </Container>
  );
}

function Loading() {
  return <></>;
}

export default CampaignDraft;

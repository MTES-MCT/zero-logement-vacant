import fp from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import * as yup from 'yup';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody, { Body } from '../../components/Draft/DraftBody';
import { Campaign } from '../../models/Campaign';
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
import DraftMailInfo, {
  Written,
  writtenSchema,
} from '../../components/Draft/DraftMailInfo';
import { DraftCreationPayload } from '../../models/Draft';
import DraftSenderLogo from '../../components/Draft/DraftSenderLogo';
import DraftSignature from '../../components/Draft/DraftSignature';

const schema = yup
  .object({
    subject: yup
      .string()
      .required('Veuillez renseigner l’objet de votre courrier'),
    body: yup
      .string()
      .required('Veuillez renseigner le contenu de votre courrier'),
    sender: senderSchema,
  })
  // Must do like that because the useForm hook has a validation bug
  // where it creates an infinite render loop if passed a `written` object
  .concat(writtenSchema);

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Readonly<Props>) {
  const { count, draft, isLoadingDraft } = useCampaign();

  useDocumentTitle(props.campaign.title);

  const [values, setValues] = useState<DraftCreationPayload>({
    subject: '',
    body: '',
    campaign: '',
    logo: [],
    sender: {
      name: '',
      service: '',
      firstName: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
      signatoryFirstName: '',
      signatoryLastName: '',
      signatoryRole: '',
      signatoryFile: '',
    },
    writtenAt: '',
    writtenFrom: '',
  });

  useEffect(() => {
    if (draft) {
      setValues({
        subject: draft.subject,
        body: draft.body,
        logo: draft.logo,
        campaign: props.campaign.id,
        sender: draft.sender,
        writtenAt: draft.writtenAt,
        writtenFrom: draft.writtenFrom,
      });
    }
  }, [draft, props.campaign.id]);

  const form = useForm(schema, {
    subject: values.subject,
    body: values.body,
    sender: values.sender,
    writtenAt: values.writtenAt,
    writtenFrom: values.writtenFrom,
  });

  const hasChanges = form.isDirty && !fp.equals(draft, values);

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

  function setBody(body: Body): void {
    setValues({ ...values, ...body });
  }

  function setLogo(logo: string[]): void {
    setValues({ ...values, logo });
  }

  function setSender(sender: SenderPayload): void {
    setValues({ ...values, sender });
  }

  function setSignature(sender: SenderPayload): void {
    setSender(sender);
  }

  function setWritten(written: Written): void {
    setValues({
      ...values,
      writtenAt: written.at,
      writtenFrom: written.from,
    });
  }

  if (isLoadingDraft) {
    return <Loading />;
  }

  if (!values) {
    return <Loading />;
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
          <Row gutters spacing="mb-2w">
            <Col n="5">
              <DraftSenderLogo
                className="fr-mb-2w"
                value={values.logo}
                onChange={setLogo}
              />
              <DraftMailInfo
                form={form}
                writtenAt={values.writtenAt}
                writtenFrom={values.writtenFrom}
                onChange={setWritten}
              />
            </Col>
            <Col n="7">
              <DraftSender
                form={form}
                value={values.sender}
                onChange={setSender}
              />
            </Col>
          </Row>
          <Row spacing="mb-2w">
            <Col>
              <DraftBody
                body={values.body}
                form={form}
                subject={values.subject}
                onChange={setBody}
              />
            </Col>
          </Row>
          <Row>
            <Col n="7" offset="5">
              <DraftSignature
                form={form}
                value={values.sender}
                onChange={setSignature}
              />
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

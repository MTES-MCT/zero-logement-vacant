import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Grid from '@mui/material/Unstable_Grid2';
import fp from 'lodash/fp';
import { useEffect, useState } from 'react';
import * as yup from 'yup';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm } from '../../hooks/useForm';
import DraftBody, { Body } from '../../components/Draft/DraftBody';
import { Campaign } from '../../models/Campaign';
import { Col, Container, Row } from '../../components/_dsfr';
import {
  useCreateDraftMutation,
  useUpdateDraftMutation
} from '../../services/draft.service';
import UnsavedChanges from '../../components/UnsavedChanges/UnsavedChanges';
import PreviewButton from '../../components/Draft/PreviewButton';
import styles from './campaign.module.scss';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import DraftSender, { senderSchema } from '../../components/Draft/DraftSender';
import {
  SenderPayload,
  SignatoriesPayload,
  SignatoryPayload
} from '../../models/Sender';
import SendButton from '../../components/Draft/SendButton';
import SaveButton from '../../components/SaveButton/SaveButton';
import DraftMailInfo, {
  Written,
  writtenSchema
} from '../../components/Draft/DraftMailInfo';
import { DraftCreationPayload } from '../../models/Draft';
import DraftSenderLogo from '../../components/Draft/DraftSenderLogo';
import DraftSignature from '../../components/Draft/DraftSignature';
import CampaignRecipients from '../../components/Campaign/CampaignRecipients';
import CampaignCreatedFromGroup from '../../components/Campaign/CampaignCreatedFromGroup';
import { FileUploadDTO } from '@zerologementvacant/models';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Stepper from '@codegouvfr/react-dsfr/Stepper';

const schema = yup
  .object({
    subject: yup.string(),
    body: yup.string(),
    sender: senderSchema
  })
  // Must do like that because the useForm hook has a validation bug
  // where it creates an infinite render loop if passed a `written` object
  .concat(writtenSchema);

interface Props {
  campaign: Campaign;
}

function CampaignDraft(props: Readonly<Props>) {
  const { count, draft, isLoadingDraft } = useCampaign();

  const [values, setValues] = useState<DraftCreationPayload>({
    subject: '',
    body: '',
    campaign: props.campaign.id,
    logo: [],
    sender: {
      name: '',
      service: '',
      firstName: '',
      lastName: '',
      address: '',
      email: '',
      phone: '',
      signatories: [null, null],
      signatoryFirstName: '',
      signatoryLastName: '',
      signatoryRole: '',
      signatoryFile: null
    },
    writtenAt: '',
    writtenFrom: ''
  });

  useEffect(() => {
    if (draft) {
      setValues({
        subject: draft.subject ?? '',
        body: draft.body ?? '',
        campaign: props.campaign.id,
        logo: draft.logo ?? [],
        sender: {
          name: draft.sender?.name ?? '',
          service: draft.sender?.service ?? '',
          firstName: draft.sender?.firstName ?? '',
          lastName: draft.sender?.lastName ?? '',
          address: draft.sender?.address ?? '',
          email: draft.sender?.email ?? '',
          phone: draft.sender?.phone ?? '',
          signatories: draft.sender.signatories ?? null,
          signatoryFirstName: draft.sender?.signatoryFirstName ?? '',
          signatoryLastName: draft.sender?.signatoryLastName ?? '',
          signatoryRole: draft.sender?.signatoryRole ?? '',
          signatoryFile: draft.sender?.signatoryFile
        },
        writtenAt: draft.writtenAt ?? '',
        writtenFrom: draft.writtenFrom ?? ''
      });
    }
  }, [draft, props.campaign.id]);

  const form = useForm(schema, {
    subject: values.subject,
    body: values.body,
    sender: values.sender,
    writtenAt: values.writtenAt,
    writtenFrom: values.writtenFrom
  });

  const hasChanges = form.isDirty && !fp.equals(draft, values);

  const [createDraft, createDraftMutation] = useCreateDraftMutation();
  async function create(): Promise<void> {
    if (!draft) {
      await createDraft({ ...values, campaign: props.campaign.id }).unwrap();
    }
  }

  const [updateDraft, updateDraftMutation] = useUpdateDraftMutation();
  async function update(): Promise<void> {
    if (draft) {
      await updateDraft({ ...values, id: draft.id }).unwrap();
    }
  }

  const exists = !!draft;
  const [save, mutation] = exists
    ? [update, updateDraftMutation]
    : [create, createDraftMutation];

  const [updateCampaign] = useUpdateCampaignMutation();
  async function send(): Promise<void> {
    await save();
    await updateCampaign({ ...props.campaign, status: 'sending' });
  }

  function setBody(body: Body): void {
    setValues({ ...values, ...body });
  }

  function setLogo(logo: FileUploadDTO[]): void {
    setValues({ ...values, logo });
  }

  function setSender(sender: SenderPayload): void {
    setValues({ ...values, sender });
  }

  function setSignatories(signatories: SignatoriesPayload | null): void {
    setSender({ ...values.sender, signatories });
  }

  function setWritten(written: Written): void {
    setValues({
      ...values,
      writtenAt: written.at,
      writtenFrom: written.from
    });
  }

  if (isLoadingDraft) {
    return <Loading />;
  }

  return (
    <>
      <Grid className={styles.steps} xs={12} py={4}>
        <Grid container xsOffset={1}>
          <Grid xs={11}>
            <Stepper
              currentStep={1}
              nextTitle="Téléchargement du fichier de publipostage (XLSX) et/ou de vos courriers rédigés (PDF)."
              stepCount={2}
              title="Vérification des adresses propriétaires et édition de votre courrier"
            />
          </Grid>
          <Grid xs={11}>
            <div className={'float-right'}>
              <SendButton form={form} onSend={send} />
            </div>
          </Grid>
        </Grid>
      </Grid>

      <Grid component="article" container xs={10} xsOffset={1}>
        <Grid alignItems="center" container component="header" mb={5} xs>
          <Grid mb={2} xs={12}>
            <CampaignCreatedFromGroup campaign={props.campaign} />
          </Grid>
          <CampaignTitle
            as="h2"
            campaign={props.campaign}
            className="fr-mb-1w"
          />
          <Grid xs={6}>
            <CampaignCounts
              display="row"
              housing={count?.housing}
              owners={count?.owners}
            />
          </Grid>
          {props.campaign.description && (
            <Grid xs={12} mt={2}>
              <h3 className="fr-mb-1w fr-text--md">Description</h3>
              <p>{props.campaign.description}</p>
            </Grid>
          )}
        </Grid>
        <Tabs
          className={styles.tabs}
          classes={{
            panel: styles.panel
          }}
          tabs={[
            {
              label: 'Destinataires',
              content: <CampaignRecipients campaign={props.campaign} />
            },
            {
              label: 'Courrier',
              content: (
                <form id="draft" name="draft" className="fr-mt-2w">
                  <UnsavedChanges when={hasChanges} />
                  <Alert
                    severity="info"
                    closable
                    title="Votre courrier"
                    description='Rédigez votre courrier et insérez des champs personnalisés pour intégrer des informations sur les logements ou les propriétaires. Pour prévisualiser le format du courrier, cliquez sur "Visualiser mon brouillon". Une fois votre courrier rédigé, cliquez sur "Valider et passer au téléchargement" pour télécharger les courriers au format PDF.'
                    className="fr-mt-2w fr-mb-2w"
                  />
                  <Container as="section" fluid>
                    <Row justifyContent="right" spacing="mb-2w">
                      <SaveButton
                        className="fr-mr-1w"
                        autoClose={5000}
                        isError={mutation.isError}
                        isLoading={mutation.isLoading}
                        isSuccess={mutation.isSuccess}
                        message={{
                          success:
                            'Votre campagne a été sauvegardée avec succès'
                        }}
                        onSave={save}
                      />
                      <PreviewButton disabled={!exists} draft={draft} />
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
                    <DraftSignature
                      form={form}
                      value={values.sender.signatories}
                      onChange={setSignatories}
                    />
                  </Container>
                </form>
              )
            }
          ]}
        />
      </Grid>
    </>
  );
}

function Loading() {
  return <></>;
}

export default CampaignDraft;

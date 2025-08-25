import Alert from '@codegouvfr/react-dsfr/Alert';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers-next/yup';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { FileUploadDTO } from '@zerologementvacant/models';
import { isEqual } from 'lodash-es';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import * as yupNext from 'yup-next';

import {
  Col,
  Container as DeprecatedContainer,
  Row
} from '../../components/_dsfr';
import CampaignCounts from '../../components/Campaign/CampaignCounts';
import CampaignCreatedFromGroup from '../../components/Campaign/CampaignCreatedFromGroup';
import CampaignRecipients from '../../components/Campaign/CampaignRecipients';
import CampaignTitle from '../../components/Campaign/CampaignTitle';
import DraftBody from '../../components/Draft/DraftBody';
import DraftMailInfo, {
  Written,
  writtenSchema
} from '../../components/Draft/DraftMailInfo';
import DraftSender, { senderSchema } from '../../components/Draft/DraftSender';
import DraftSenderLogo from '../../components/Draft/DraftSenderLogo';
import DraftSignature from '../../components/Draft/DraftSignature';
import PreviewButton from '../../components/Draft/PreviewButton';
import SendButton from '../../components/Draft/SendButton';
import SaveButton from '../../components/SaveButton/SaveButton';
import { useCampaign } from '../../hooks/useCampaign';
import { useForm as deprecatedUseForm } from '../../hooks/useForm';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { Campaign } from '../../models/Campaign';
import { DraftCreationPayload } from '../../models/Draft';
import { SenderPayload, SignatoriesPayload } from '../../models/Sender';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import {
  useCreateDraftMutation,
  useUpdateDraftMutation
} from '../../services/draft.service';
import styles from './campaign.module.scss';

const schemaNext = yupNext.object({
  subject: yupNext.string().defined().nullable().default(null),
  body: yupNext.string().defined().nullable().default(null)
});

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
      signatories: [null, null]
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
          signatories: draft.sender.signatories ?? null
        },
        writtenAt: draft.writtenAt ?? '',
        writtenFrom: draft.writtenFrom ?? ''
      });
    }
  }, [draft, props.campaign.id]);

  const nextForm = useForm({
    values: {
      subject: draft?.subject ?? null,
      body: draft?.body ?? null,
      sender: {
        name: draft?.sender?.name ?? null,
        service: draft?.sender?.service ?? null,
        firstName: draft?.sender?.firstName ?? null,
        lastName: draft?.sender?.lastName ?? null,
        address: draft?.sender?.address ?? null,
        email: draft?.sender?.email ?? null,
        phone: draft?.sender?.phone ?? null,
        signatories: draft?.sender?.signatories ?? null
      }
    },
    mode: 'onSubmit',
    resolver: yupResolver(schemaNext)
  });

  const form = deprecatedUseForm(schema, {
    subject: values.subject,
    body: values.body,
    sender: values.sender,
    writtenAt: values.writtenAt,
    writtenFrom: values.writtenFrom
  });

  const hasChanges = form.isDirty && !!draft && !isEqual(draft, values);
  useUnsavedChanges({ when: hasChanges });

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
    <Container sx={{ py: 4, position: 'relative' }} maxWidth="xl">
      <Stack sx={{ mb: 4 }}>
        <Stepper
          currentStep={1}
          nextTitle="Téléchargement des fichiers et validation de la date d’envoi"
          stepCount={2}
          title="Vérification des adresses propriétaires et édition de votre courrier"
        />
        <Box sx={{ alignSelf: 'flex-end' }}>
          <SendButton form={form} onSend={send} />
        </Box>
      </Stack>

      <hr />

      <Grid component="article" container>
        <Grid
          alignItems="center"
          container
          component="header"
          mb={5}
          size="grow"
        >
          <Grid mb={2} size={12}>
            <CampaignCreatedFromGroup campaign={props.campaign} />
          </Grid>
          <CampaignTitle
            as="h2"
            campaign={props.campaign}
            className="fr-mb-1w"
          />
          <Grid size={6}>
            <CampaignCounts
              display="row"
              housing={count?.housing}
              owners={count?.owners}
            />
          </Grid>
          {props.campaign.description && (
            <Grid mt={2} size={12}>
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
                <FormProvider {...nextForm}>
                  <form
                    id="draft"
                    name="draft"
                    className="fr-mt-2w"
                    onSubmit={nextForm.handleSubmit(save)}
                  >
                    <Alert
                      severity="info"
                      closable
                      title="Votre courrier"
                      description='Rédigez votre courrier et insérez des champs personnalisés pour intégrer des informations sur les logements ou les propriétaires. Pour prévisualiser le format du courrier, cliquez sur "Visualiser mon brouillon". Une fois votre courrier rédigé, cliquez sur "Valider et passer au téléchargement" pour télécharger les courriers au format PDF.'
                      className="fr-mt-2w fr-mb-2w"
                    />
                    <DeprecatedContainer as="section" fluid>
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
                          <DraftSender />
                        </Col>
                      </Row>
                      <Row spacing="mb-2w">
                        <Col>
                          <DraftBody />
                        </Col>
                      </Row>
                      <DraftSignature
                        form={form}
                        value={values.sender.signatories}
                        onChange={setSignatories}
                      />
                    </DeprecatedContainer>
                  </form>
                </FormProvider>
              )
            }
          ]}
        />
      </Grid>
    </Container>
  );
}

function Loading() {
  return <></>;
}

export default CampaignDraft;

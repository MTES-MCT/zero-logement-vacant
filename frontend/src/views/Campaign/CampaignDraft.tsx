import Alert from '@codegouvfr/react-dsfr/Alert';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import { yupResolver } from '@hookform/resolvers-next/yup';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { FormProvider, useForm } from 'react-hook-form';
import * as yupNext from 'yup-next';

import SendButton from '~/components/Draft/SendButton';
import createSendModal from '~/components/Draft/SendModal';
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
  writtenSchema
} from '../../components/Draft/DraftMailInfo';
import DraftSender, { senderSchema } from '../../components/Draft/DraftSender';
import DraftSenderLogo, {
  logoSchema
} from '../../components/Draft/DraftSenderLogo';
import DraftSignature, {
  signatureSchema
} from '../../components/Draft/DraftSignature';
import PreviewButton from '../../components/Draft/PreviewButton';
import SaveButton from '../../components/SaveButton/SaveButton';
import { useCampaign } from '../../hooks/useCampaign';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { Campaign } from '../../models/Campaign';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import {
  useCreateDraftMutation,
  useUpdateDraftMutation
} from '../../services/draft.service';
import styles from './campaign.module.scss';

const schemaNext = yupNext
  .object({
    subject: yupNext.string().defined().nullable().default(null),
    body: yupNext.string().defined().nullable().default(null),
    sender: senderSchema.concat(signatureSchema)
  })
  .concat(logoSchema)
  .concat(writtenSchema);

type FormSchema = yupNext.InferType<typeof schemaNext>;

const sendModal = createSendModal();

interface CampaignDraftProps {
  campaign: Campaign;
}

function CampaignDraft(props: Readonly<CampaignDraftProps>) {
  const { count, draft, isLoadingDraft } = useCampaign();

  const form = useForm<FormSchema>({
    values: {
      subject: draft?.subject ?? null,
      body: draft?.body ?? null,
      logo: draft?.logo ?? [],
      sender: {
        name: draft?.sender?.name ?? null,
        service: draft?.sender?.service ?? null,
        firstName: draft?.sender?.firstName ?? null,
        lastName: draft?.sender?.lastName ?? null,
        address: draft?.sender?.address ?? null,
        email: draft?.sender?.email ?? null,
        phone: draft?.sender?.phone ?? null,
        signatories: draft?.sender?.signatories ?? null
      },
      writtenAt: draft?.writtenAt ?? null,
      writtenFrom: draft?.writtenFrom ?? null
    },
    mode: 'onSubmit',
    resolver: yupResolver(schemaNext)
  });

  const hasChanges = form.formState.isDirty;
  useUnsavedChanges({ when: hasChanges });

  const [createDraft, createDraftMutation] = useCreateDraftMutation();
  async function create(): Promise<void> {
    await createDraft({
      ...form.getValues(),
      campaign: props.campaign.id
    }).unwrap();
  }

  const [updateDraft, updateDraftMutation] = useUpdateDraftMutation();
  async function update(): Promise<void> {
    if (draft) {
      await updateDraft({ ...form.getValues(), id: draft.id }).unwrap();
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
          <SendButton onClick={sendModal.open} />
          <sendModal.Component onSend={send} />
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
                <FormProvider {...form}>
                  <form
                    id="draft"
                    name="draft"
                    className="fr-mt-2w"
                    onSubmit={form.handleSubmit(save)}
                  >
                    <Alert
                      severity="info"
                      closable
                      title="Votre courrier"
                      description='Rédigez votre courrier et insérez des champs personnalisés pour intégrer des informations sur les logements ou les propriétaires. Pour prévisualiser le format du courrier, cliquez sur "Visualiser mon brouillon". Une fois votre courrier rédigé, cliquez sur "Valider et passer au téléchargement" pour télécharger les courriers au format PDF.'
                      className="fr-mt-2w fr-mb-2w"
                    />
                    <DeprecatedContainer as="section" fluid>
                      {JSON.stringify(form.getValues())}
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
                          onSave={form.handleSubmit(save)}
                        />
                        <PreviewButton disabled={!exists} draft={draft} />
                      </Row>
                      <Row gutters spacing="mb-2w">
                        <Col n="5">
                          <DraftSenderLogo />
                          <DraftMailInfo />
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
                      <DraftSignature />
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

import Alert from '@codegouvfr/react-dsfr/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

import DraftBody, { type Body } from '~/components/Draft/DraftBody';
import DraftMailInfo, { type Written } from '~/components/Draft/DraftMailInfo';
import DraftSender from '~/components/Draft/DraftSender';
import DraftSenderLogo from '~/components/Draft/DraftSenderLogo';
import DraftSignature from '~/components/Draft/DraftSignature';
import PreviewButton from '~/components/Draft/PreviewButton';
import SaveButton from '~/components/SaveButton/SaveButton';
import { useCampaign } from '~/hooks/useCampaign';
import { useDraftForm } from './DraftFormProvider';

function CampaignDraftContent() {
  const { draft } = useCampaign();
  const {
    values,
    setBody,
    setLogo,
    setSender,
    setSignatories,
    setWritten,
    form,
    save,
    isSaving,
    isError,
    isSuccess,
    exists
  } = useDraftForm();

  function handleBodyChange(body: Body): void {
    setBody(body);
  }

  function handleWrittenChange(written: Written): void {
    setWritten({ at: written.at, from: written.from });
  }

  return (
    <form id="draft" name="draft" className="fr-mt-2w">
      <Alert
        severity="info"
        closable
        title="Votre courrier"
        description='Rédigez votre courrier et insérez des champs personnalisés pour intégrer des informations sur les logements ou les propriétaires. Pour prévisualiser le format du courrier, cliquez sur "Visualiser mon brouillon". Une fois votre courrier rédigé, cliquez sur "Valider et passer au téléchargement" pour télécharger les courriers au format PDF.'
        className="fr-mt-2w fr-mb-2w"
      />
      <Stack component="section" spacing="1rem" useFlexGap>
        <Stack direction="row" justifyContent="flex-end">
          <SaveButton
            className="fr-mr-1w"
            autoClose={5000}
            isError={isError}
            isLoading={isSaving}
            isSuccess={isSuccess}
            message={{
              success: 'Votre campagne a été sauvegardée avec succès'
            }}
            onSave={save}
          />
          <PreviewButton disabled={!exists} draft={draft} />
        </Stack>
        <Grid container spacing={2}>
          <Grid size={5}>
            <DraftSenderLogo
              className="fr-mb-2w"
              value={values.logo}
              onChange={setLogo}
            />
            <DraftMailInfo
              form={form}
              writtenAt={values.writtenAt}
              writtenFrom={values.writtenFrom}
              onChange={handleWrittenChange}
            />
          </Grid>
          <Grid size={7}>
            <DraftSender
              form={form}
              value={values.sender}
              onChange={setSender}
            />
          </Grid>
        </Grid>
        <Box>
          <DraftBody
            body={values.body}
            form={form}
            subject={values.subject}
            onChange={handleBodyChange}
          />
        </Box>
        <DraftSignature
          form={form}
          value={values.sender.signatories}
          onChange={setSignatories}
        />
      </Stack>
    </form>
  );
}

export default CampaignDraftContent;

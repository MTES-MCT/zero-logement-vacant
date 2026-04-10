import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import {
  type DocumentDTO,
  type SenderPayload
} from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { mixed, tuple, type InferType } from 'yup';

import { Tuple } from 'effect';
import DraftBodyNext from '~/components/Draft/DraftBodyNext';
import DraftRedaction from '~/components/Draft/DraftRedaction';
import DraftSenderLogoNext from '~/components/Draft/DraftSenderLogoNext';
import DraftSenderNext from '~/components/Draft/DraftSenderNext';
import DraftSignatureNext from '~/components/Draft/DraftSignatureNext';
import PreviewButtonNext from '~/components/Draft/PreviewButtonNext';
import SaveButton from '~/components/SaveButton/SaveButton';
import type { Campaign } from '~/models/Campaign';
import type { Draft } from '~/models/Draft';
import { useUpdateDraftNextMutation } from '~/services/draft.service';
import DraftDownloaderButton from './DraftDownloaderButton';

// Override logo and signatory’s document field to use DocumentDTO
// instead of its id to simplify form management
const signatory = schemas.signatory.shape({
  document: mixed<DocumentDTO>().optional().nullable().default(null)
});
const draftUpdatePayload = schemas.draftUpdatePayload.shape({
  logo: tuple([
    mixed<DocumentDTO>().optional().nullable().default(null),
    mixed<DocumentDTO>().optional().nullable().default(null)
  ])
    .defined()
    .default([null, null]),
  sender: schemas.sender
    .optional()
    .nullable()
    .default(null)
    .shape({
      signatories: tuple([
        signatory.optional().nullable().default(null),
        signatory.optional().nullable().default(null)
      ])
        .optional()
        .nullable()
        .transform((value) => value ?? [null, null])
        .default([null, null])
    })
});
export type DraftFormSchema = InferType<typeof draftUpdatePayload>;

export interface DraftFormProps {
  campaign: Campaign;
  draft: Draft;
}

function DraftForm(props: Readonly<DraftFormProps>) {
  const [updateDraftNext, updateDraftNextMutation] =
    useUpdateDraftNextMutation();

  const form = useForm<DraftFormSchema>({
    mode: 'onSubmit',
    values: {
      subject: props.draft.subject,
      body: props.draft.body,
      logo: props.draft.logoNext,
      writtenAt: props.draft.writtenAt,
      writtenFrom: props.draft.writtenFrom,
      sender: {
        name: props.draft.sender.name,
        service: props.draft.sender.service,
        firstName: props.draft.sender.firstName,
        lastName: props.draft.sender.lastName,
        address: props.draft.sender.address,
        email: props.draft.sender.email,
        phone: props.draft.sender.phone,
        signatories: [
          {
            firstName: props.draft.sender.signatories?.[0]?.firstName ?? null,
            lastName: props.draft.sender.signatories?.[0]?.lastName ?? null,
            role: props.draft.sender.signatories?.[0]?.role ?? null,
            document: props.draft.sender.signatories?.[0]?.document ?? null
          },
          {
            firstName: props.draft.sender.signatories?.[1]?.firstName ?? null,
            lastName: props.draft.sender.signatories?.[1]?.lastName ?? null,
            role: props.draft.sender.signatories?.[1]?.role ?? null,
            document: props.draft.sender.signatories?.[1]?.document ?? null
          }
        ]
      }
    },
    resolver: yupResolver(draftUpdatePayload)
  });

  const submit: SubmitHandler<DraftFormSchema> = async (data) => {
    const signatories: SenderPayload['signatories'] = data.sender?.signatories
      ? Tuple.map(data.sender.signatories, (signatory) =>
          signatory
            ? {
                ...signatory,
                document: signatory?.document ? signatory.document.id : null
              }
            : null
        )
      : [null, null];
    await updateDraftNext({
      id: props.draft.id,
      subject: data.subject ?? null,
      body: data.body ?? null,
      logo: Tuple.map(data.logo, (logo) => logo?.id ?? null) ?? [null, null],
      writtenAt: data.writtenAt ?? null,
      writtenFrom: data.writtenFrom ?? null,
      sender: data.sender ? { ...data.sender, signatories } : null
    });
  };

  return (
    <FormProvider {...form}>
      <form id="draft-form" onSubmit={form.handleSubmit(submit)}>
        <Grid container spacing="1rem">
          <Grid size={12}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing="0.5rem"
              sx={{ justifyContent: 'flex-end' }}
            >
              <SaveButton
                isError={updateDraftNextMutation.isError}
                isLoading={updateDraftNextMutation.isLoading}
                isSuccess={updateDraftNextMutation.isSuccess}
                message={{
                  error: 'Erreur lors de la sauvegarde du brouillon',
                  loading: 'Sauvegarde du brouillon...',
                  success: 'Brouillon sauvegardé !'
                }}
                type="submit"
              />

              <PreviewButtonNext
                campaign={props.campaign}
                draft={props.draft}
                type="button"
              />

              <DraftDownloaderButton campaign={props.campaign} />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing="1rem" useFlexGap>
              <DraftSenderLogoNext />
              <DraftRedaction />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <DraftSenderNext />
          </Grid>

          <Grid size={12}>
            <DraftBodyNext />
          </Grid>

          <Grid size={12}>
            <DraftSignatureNext />
          </Grid>
        </Grid>
      </form>
    </FormProvider>
  );
}

export default DraftForm;

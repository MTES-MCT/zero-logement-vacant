import { yupResolver } from '@hookform/resolvers/yup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import type { SignatoryPayload } from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { type InferType } from 'yup';

import DraftBodyNext from '~/components/Draft/DraftBodyNext';
import DraftRedaction from '~/components/Draft/DraftRedaction';
import DraftSenderLogoNext from '~/components/Draft/DraftSenderLogoNext';
import DraftSenderNext from '~/components/Draft/DraftSenderNext';
import DraftSignatureNext from '~/components/Draft/DraftSignatureNext';
import type { Draft } from '~/models/Draft';
import { useUpdateDraftNextMutation } from '~/services/draft.service';

export type DraftFormSchema = InferType<typeof schemas.draftUpdatePayload>;

export interface DraftFormProps {
  draft: Draft;
}

function DraftForm(props: Readonly<DraftFormProps>) {
  const [updateDraftNext] = useUpdateDraftNextMutation();

  const form = useForm<DraftFormSchema>({
    mode: 'onSubmit',
    values: {
      subject: props.draft.subject,
      body: props.draft.body,
      logo: [
        props.draft.logoNext?.[0]?.id ?? null,
        props.draft.logoNext?.[1]?.id ?? null
      ],
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
            document: props.draft.sender.signatories?.[0]?.document?.id ?? null
          },
          {
            firstName: props.draft.sender.signatories?.[1]?.firstName ?? null,
            lastName: props.draft.sender.signatories?.[1]?.lastName ?? null,
            role: props.draft.sender.signatories?.[1]?.role ?? null,
            document: props.draft.sender.signatories?.[1]?.document?.id ?? null
          }
        ]
      }
    },
    resolver: yupResolver(schemas.draftUpdatePayload)
  });

  const submit: SubmitHandler<DraftFormSchema> = async (data) => {
    const signatories = (data.sender?.signatories ?? [null, null]) as [
      SignatoryPayload | null,
      SignatoryPayload | null
    ];
    await updateDraftNext({
      id: props.draft.id,
      subject: data.subject ?? null,
      body: data.body ?? null,
      logo: (data.logo ?? [null, null]) as [string | null, string | null],
      writtenAt: data.writtenAt ?? null,
      writtenFrom: data.writtenFrom ?? null,
      sender: data.sender ? { ...data.sender, signatories } : null
    });
  };

  return (
    <FormProvider {...form}>
      <form id="draft-form" onSubmit={form.handleSubmit(submit)}>
        <Grid container spacing="1rem">
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

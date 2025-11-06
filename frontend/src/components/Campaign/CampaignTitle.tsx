import Button from '@codegouvfr/react-dsfr/Button';
import { yupResolver } from '@hookform/resolvers/yup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { useNotification } from '~/hooks/useNotification';
import type { Campaign } from '../../models/Campaign';
import { useUpdateCampaignMutation } from '../../services/campaign.service';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import { createConfirmationModal } from '../modals/ConfirmationModal/ConfirmationModalNext';
import styles from './campaign.module.scss';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const modal = createConfirmationModal({
  id: 'campaign-title-modal',
  isOpenedByDefault: false
});

const schema = yup.object({
  title: yup
    .string()
    .max(
      64,
      'La longueur maximale du titre de la campagne est de 64 caractères.'
    )
    .required('Veuillez renseigner le titre de la campagne.'),
  description: yup
    .string()
    .max(
      1000,
      'La longueur maximale de la description de la campagne est de 1000 caractères.'
    )
    .required('Veuillez renseigner la descripion de la campagne.')
});

type FormSchema = yup.InferType<typeof schema>;

interface Props {
  campaign: Campaign;
  className?: string;
  as?: TitleAs;
  look?: TitleAs;
}

function CampaignTitle({ campaign, className, as, look }: Readonly<Props>) {
  const [updateCampaign, updateCampaignMutation] = useUpdateCampaignMutation();

  useNotification({
    isError: updateCampaignMutation.isError,
    isLoading: updateCampaignMutation.isLoading,
    isSuccess: updateCampaignMutation.isSuccess,
    message: {
      error: 'Erreur lors de la mise à jour de la campagne.',
      loading: 'Mise à jour de la campagne...',
      success: 'La campagne a été mise à jour.'
    },
    toastId: 'campaign-title-update'
  });

  const form = useForm({
    defaultValues: {
      title: campaign.title,
      description: campaign.description
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  function submit(): void {
    const values = form.getValues();
    updateCampaign({
      ...campaign,
      title: values.title,
      description: values.description || ''
    })
      .unwrap()
      .finally(() => {
        modal.close();
      });
  }

  return (
    <>
      <Stack
        direction="row"
        component="section"
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
      </Stack>
      <modal.Component
        title="Modifier les informations de la campagne"
        onSubmit={form.handleSubmit(submit)}
      >
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(submit)}>
            <Stack>
              <AppTextInputNext<FormSchema>
                label="Titre de la campagne (obligatoire)"
                name="title"
              />
              <AppTextInputNext<FormSchema>
                textArea
                label="Description de la campagne (obligatoire)"
                name="description"
              />
            </Stack>
          </form>
        </FormProvider>
      </modal.Component>
    </>
  );
}

export default CampaignTitle;

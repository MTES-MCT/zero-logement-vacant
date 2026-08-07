import { yupResolver } from '@hookform/resolvers/yup';
import Typography from '@mui/material/Typography';
import schemas from '@zerologementvacant/schemas';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { object, type InferType } from 'yup';

import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';

import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';

const schema = object({
  sentAt: schemas.dateString.required('Veuillez renseigner une date d’envoi')
});
type FormValues = InferType<typeof schema>;

/**
 * Whether a campaign's sending date has arrived: `sentAt` is set and on or
 * before today. Mirrors the backend's `isSendDateReached` (CampaignApi.ts) —
 * only a reached sentAt can have auto-flipped any housing, so only a reached
 * sentAt warrants warning about a revert.
 */
function isSendDateReached(sentAt: string | null): boolean {
  return (
    sentAt !== null && sentAt.slice(0, 10) <= format(new Date(), 'yyyy-MM-dd')
  );
}

export interface CampaignSentAtModalProps {
  sentAt: string | null;
  /**
   * @param date - An ISO date (YYYY-MM-DD)
   */
  onConfirm(sentAt: string): void;
}

export function createCampaignSentAtModal() {
  const modal = createConfirmationModal({
    id: 'campaign-sent-at-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: Readonly<CampaignSentAtModalProps>) {
      const form = useForm<FormValues>({
        values: {
          sentAt: props.sentAt ?? ''
        },
        resolver: yupResolver(schema)
      });

      const onSubmit: SubmitHandler<FormValues> = (values) => {
        props.onConfirm(values.sentAt);
        modal.close();
        form.reset();
      };

      return createPortal(
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <modal.Component title="Indiquer la date d’envoi">
              <Typography sx={{ mb: '1rem' }}>
                {`Indiquer la date d’envoi permet d'afficher le taux de retour de la campagne et d'inscrire cette date dans l'historique de chacun des logements. Le jour de la date d’envoi, le statut des logements « Non suivi » passera à « En attente de retour » (si vous indiquez une date antérieure à aujourd’hui, cette mise à jour sera immédiate).`}
              </Typography>
              {isSendDateReached(props.sentAt) && (
                <Typography sx={{ mb: '1rem' }}>
                  {`Si vous repoussez cette date à une date future, les logements automatiquement passés à « En attente de retour » seront remis à « Non suivi ».`}
                </Typography>
              )}
              <AppTextInputNext
                label="Date d’envoi"
                name="sentAt"
                control={form.control}
                nativeInputProps={{
                  type: 'date'
                }}
              />
            </modal.Component>
          </form>
        </FormProvider>,
        document.body
      );
    }
  };
}

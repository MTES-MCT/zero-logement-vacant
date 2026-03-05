import { yupResolver } from '@hookform/resolvers/yup';
import Typography from '@mui/material/Typography';
import schemas from '@zerologementvacant/schemas';
import { createPortal } from 'react-dom';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { object, type InferType } from 'yup';

import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';

const schema = object({
  sentAt: schemas.dateString.required('Veuillez renseigner une date d’envoi')
});
type FormValues = InferType<typeof schema>;

interface Props {
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
    Component(props: Readonly<Props>) {
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
                {`Indiquer la date d’envoi permet d'afficher le taux de retour de la campagne et d'inscrire cette date dans l'historique de chacun des logements.`}
              </Typography>
              <AppTextInputNext
                label="Date d’envoi"
                name="sentAt"
                control={form.control}
                nativeInputProps={{
                  type: 'date'
                }}
                mapValue={(value) => value}
                contramapValue={value => {
                  console.log(value)
                  return value
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

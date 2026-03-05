import Input from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';
import { createPortal } from 'react-dom';

interface FormValues {
  sentAt: string;
}

interface Props {
  defaultValue?: string;
  onConfirm: (isoDate: string) => void;
}

export function createCampaignSentAtModal() {
  const modal = createModal({
    id: 'campaign-sent-at-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: Readonly<Props>) {
      const { register, handleSubmit } = useForm<FormValues>({
        defaultValues: { sentAt: props.defaultValue ?? '' }
      });

      function onSubmit(values: FormValues): void {
        props.onConfirm(values.sentAt);
        modal.close();
      }

      return createPortal(
        <modal.Component
          title="Indiquer la date d\u2019envoi"
          buttons={[
            {
              children: 'Annuler',
              priority: 'secondary',
              doClosesModal: true
            },
            {
              children: 'Confirmer',
              onClick: handleSubmit(onSubmit),
              doClosesModal: false
            }
          ]}
        >
          <Typography sx={{ mb: '1rem' }}>
            {`Indiquer la date d\u2019envoi permet d\u2019afficher le taux de retour de la campagne et d\u2019inscrire cette date dans l\u2019historique de chacun des logements.`}
          </Typography>
          <Input
            label="Date d\u2019envoi"
            nativeInputProps={{
              type: 'date',
              ...register('sentAt')
            }}
          />
        </modal.Component>,
        document.body
      );
    }
  };
}

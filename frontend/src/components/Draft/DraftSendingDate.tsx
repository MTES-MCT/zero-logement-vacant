import * as yup from 'yup';

import { useForm } from '../../hooks/useForm';
import { Container } from '../_dsfr';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { DATE_REGEXP } from '../../utils/dateUtils';
import { Typography } from '@mui/material';

export const sentAtSchema = yup.string()
  .required('Veuillez renseigner une date d\'envoi')
  .matches(DATE_REGEXP, 'Veuillez renseigner une date au format yyyy-mm-dd');

interface Props {
  className?: string;
  disabled?: boolean;
  form: ReturnType<typeof useForm>;
  value?: string;
  onChange(value: string): void;
}

function DraftSendingDate(props: Readonly<Props>) {
  const value = props.value;

  return (
    <Container as="section" className={props.className} fluid>
      <Typography variant="h5" mb={2}>
        2. Indiquez la date d’envoi de la campagne
      </Typography>
      <AppTextInput
        disabled={props.disabled}
        inputForm={props.form}
        inputKey="sentAt"
        label="Date d’envoi (obligatoire)"
        type="date"
        value={value}
        onChange={(e) => props.onChange(e.target.value)}
        className="fr-mb-2w"
      />
    </Container>
  );
}

export default DraftSendingDate;

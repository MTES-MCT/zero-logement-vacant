import { string } from 'yup';

import { useForm } from '../../hooks/useForm';
import { Container } from '../_dsfr';
import AppTextInput from '../_app/AppTextInput/AppTextInput';

const DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;
export const sentAtSchema = string()
  .required('Veuillez renseigner une date d’envoi')
  .matches(DATE_REGEXP, 'Veuillez renseigner une date au format yyyy-mm-dd');

interface Props {
  className?: string;
  disabled?: boolean;
  form: ReturnType<typeof useForm>;
  value?: string;
  onChange(value: string): void;
}

function DraftSendingDate(props: Props) {
  const value = props.value;

  return (
    <Container as="section" className={props.className} fluid>
      <AppTextInput
        disabled={props.disabled}
        inputForm={props.form}
        inputKey="sentAt"
        label="Date d’envoi de votre campagne*"
        type="date"
        value={value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Container>
  );
}

export default DraftSendingDate;

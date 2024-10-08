import { string } from 'yup';

import { useForm } from '../../hooks/useForm';
import { Container } from '../_dsfr';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { DATE_REGEXP } from '../../utils/dateUtils';
import { Typography } from '@mui/material';
import styles from './draft.module.scss';

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

function DraftSendingDate(props: Readonly<Props>) {
  const value = props.value;

  return (
    <Container as="section" className={props.className} fluid>
      <Typography variant="h5" mb={2}>Votre date d’envoi de campagne</Typography>
      <AppTextInput
        disabled={props.disabled}
        inputForm={props.form}
        inputKey="sentAt"
        label="Date d’envoi de votre campagne (obligatoire)"
        type="date"
        value={value}
        onChange={(e) => props.onChange(e.target.value)}
        className="fr-mb-2w"
      />
      <p className={`fr-info-text ${styles.info}`}>Après avoir téléchargé vos documents, indiquez la date d’envoi de votre campagne. Le statut des logements &quot;Non suivi&quot; passera automatiquement au statut &quot;En attente de retour&quot;. Les autres statuts ne seront pas modifiés.</p>
    </Container>
  );
}

export default DraftSendingDate;

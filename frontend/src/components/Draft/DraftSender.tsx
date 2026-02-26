import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import schemas from '@zerologementvacant/schemas';
import type { ChangeEvent, ChangeEventHandler } from 'react';
import * as yup from 'yup';

import AppTextInput from '~/components/_app/AppTextInput/AppTextInput';
import { useForm } from '~/hooks/useForm';
import type { Sender, SenderPayload } from '~/models/Sender';
import styles from './draft.module.scss';

export const senderSchema = yup.object({
  name: yup.string().trim().default(undefined),
  service: yup.string().trim().default(undefined),
  firstName: yup.string().trim().default(undefined),
  lastName: yup.string().trim().default(undefined),
  address: yup.string().trim().default(undefined),
  email: yup
    .string()
    .nullable()
    .default(undefined)
    .email(
      'Veuillez renseigner un courriel valide. Exemple de format valide : exemple@gmail.com'
    ),
  phone: schemas.phone.nullable().default(undefined)
});

interface Props {
  form: ReturnType<typeof useForm>;
  value: SenderPayload;
  onChange(value: SenderPayload): void;
}

function DraftSender(props: Readonly<Props>) {
  const email = props.value.email ?? '';
  const phone = props.value.phone ?? '';

  function onChange(key: keyof Sender): ChangeEventHandler {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (props.value) {
        props.onChange({
          ...props.value,
          [key]: e.target.value
        });
      }
    };
  }

  return (
    <Grid component="article" container className={styles.article} spacing={2}>
      <Grid size={12}>
        <Typography component="h4" variant="h6" mb={2}>
          Coordonnées de l’expéditeur
        </Typography>
      </Grid>
      <Grid size={12}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.name"
          label="Nom de la collectivité ou de l’administration"
          value={props.value.name}
          onChange={onChange('name')}
        />
      </Grid>
      <Grid size={12}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.service"
          label="Service"
          value={props.value.service}
          onChange={onChange('service')}
        />
      </Grid>
      <Grid size={6}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.lastName"
          label="Nom"
          value={props.value.lastName}
          onChange={onChange('lastName')}
        />
      </Grid>
      <Grid size={6}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.firstName"
          label="Prénom"
          value={props.value.firstName}
          onChange={onChange('firstName')}
        />
      </Grid>
      <Grid size={12}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.address"
          label="Adresse"
          value={props.value.address}
          onChange={onChange('address')}
        />
      </Grid>
      <Grid size={6}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.email"
          label="Adresse e-mail"
          value={email}
          type="email"
          onChange={onChange('email')}
        />
      </Grid>
      <Grid size={6}>
        <AppTextInput
          inputForm={props.form}
          inputKey="sender.phone"
          label="Téléphone"
          value={phone}
          type="tel"
          onChange={onChange('phone')}
        />
      </Grid>
    </Grid>
  );
}

export default DraftSender;

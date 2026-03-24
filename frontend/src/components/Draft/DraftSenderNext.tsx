import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import type { DraftFormSchema } from '~/components/Draft/DraftForm';
import AppTextInputNext from '../_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

function nullOrEmptyString(value: string | null): string {
  return value ?? '';
}

function emptyStringToNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}

function DraftSenderNext() {
  return (
    <Grid
      component="article"
      container
      role="group"
      aria-labelledby="draft-sender-label"
      className={styles.article}
      spacing="1rem"
    >
      <Grid size={12}>
        <Typography id="draft-sender-label" component="h4" variant="h6">
          Coordonnées de l’expéditeur
        </Typography>
      </Grid>

      <Grid size={12}>
        <AppTextInputNext<DraftFormSchema, 'sender.name'>
          name="sender.name"
          label="Nom de la collectivité ou de l’administration"
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>

      <Grid size={12}>
        <AppTextInputNext<DraftFormSchema, 'sender.service'>
          name="sender.service"
          label="Service"
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <AppTextInputNext<DraftFormSchema, 'sender.lastName'>
          name="sender.lastName"
          label="Nom"
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <AppTextInputNext<DraftFormSchema, 'sender.firstName'>
          name="sender.firstName"
          label="Prénom"
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>

      <Grid size={12}>
        <AppTextInputNext<DraftFormSchema, 'sender.address'>
          name="sender.address"
          label="Adresse"
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <AppTextInputNext<DraftFormSchema, 'sender.email'>
          name="sender.email"
          label="Adresse e-mail"
          hintText="Format attendu : prenom.nom@domaine.fr"
          nativeInputProps={{
            type: 'email',
            autoComplete: 'email'
          }}
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <AppTextInputNext<DraftFormSchema, 'sender.phone'>
          name="sender.phone"
          label="Téléphone"
          hintText="Format attendu : 0123456789 ou +33123456789"
          nativeInputProps={{
            type: 'tel',
            autoComplete: 'tel'
          }}
          mapValue={nullOrEmptyString}
          contramapValue={emptyStringToNull}
        />
      </Grid>
    </Grid>
  );
}

export default DraftSenderNext;

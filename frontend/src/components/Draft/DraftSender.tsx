import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { object, string, type InferType } from 'yup-next';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

export const senderSchema = object({
  name: string().trim().defined().nullable(),
  service: string().trim().defined().nullable(),
  firstName: string().trim().defined().nullable(),
  lastName: string().trim().defined().nullable(),
  address: string().trim().defined().nullable(),
  email: string()
    .trim()
    .email('Veuillez renseigner un courriel valide')
    .defined()
    .nullable(),
  phone: string()
    .trim()
    .defined()
    .nullable()
    .matches(/^\d{10}$/, {
      message: 'Veuillez renseigner un numéro de téléphone valide',
      excludeEmptyString: true
    })
});

export type SenderSchema = InferType<typeof senderSchema>;

function DraftSender() {
  return (
    <Stack component="article" className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Coordonnées de l’expéditeur
      </Typography>
      <AppTextInputNext<SenderSchema['name']>
        name="sender.name"
        label="Nom de la collectivité ou de l’administration"
      />
      <AppTextInputNext name="sender.service" label="Service" />
      <Grid container className={styles.row} columnSpacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext name="sender.lastName" label="Nom" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext name="sender.firstName" label="Prénom" />
        </Grid>
      </Grid>
      <AppTextInputNext name="sender.address" label="Adresse" />
      <Grid container columnSpacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext
            name="sender.email"
            label="Adresse courriel"
            nativeInputProps={{ type: 'email' }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext
            name="sender.phone"
            label="Téléphone"
            nativeInputProps={{ type: 'tel' }}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

export default DraftSender;

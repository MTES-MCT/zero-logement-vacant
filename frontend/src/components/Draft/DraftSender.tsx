import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { DraftUpdatePayload } from '@zerologementvacant/models';
import AppTextInputNext, {
  contramapEmptyString,
  mapNull
} from '~/components/_app/AppTextInput/AppTextInputNext';
import styles from './draft.module.scss';

export type SenderSchema = DraftUpdatePayload['sender'];

function DraftSender() {
  return (
    <Stack component="article" className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Coordonnées de l’expéditeur
      </Typography>
      <AppTextInputNext<SenderSchema['name']>
        name="sender.name"
        label="Nom de la collectivité ou de l’administration"
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
      <AppTextInputNext<SenderSchema['service']>
        name="sender.service"
        label="Service"
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
      <Grid container className={styles.row} columnSpacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<SenderSchema['lastName']>
            name="sender.lastName"
            label="Nom"
            mapValue={mapNull}
            contramapValue={contramapEmptyString}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<SenderSchema['firstName']>
            name="sender.firstName"
            label="Prénom"
            mapValue={mapNull}
            contramapValue={contramapEmptyString}
          />
        </Grid>
      </Grid>
      <AppTextInputNext<SenderSchema['email']>
        name="sender.address"
        label="Adresse"
        mapValue={mapNull}
        contramapValue={contramapEmptyString}
      />
      <Grid container columnSpacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<SenderSchema['email']>
            name="sender.email"
            label="Adresse courriel"
            nativeInputProps={{ type: 'email' }}
            mapValue={mapNull}
            contramapValue={contramapEmptyString}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AppTextInputNext<SenderSchema['phone']>
            name="sender.phone"
            label="Téléphone"
            nativeInputProps={{ type: 'tel' }}
            mapValue={mapNull}
            contramapValue={contramapEmptyString}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

export default DraftSender;

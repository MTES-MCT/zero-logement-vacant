import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import { useActivationEmail } from '../../../hooks/useActivationEmail';
import { emailValidator } from '../../../hooks/useForm';
import AppTextInputNext from '../../../components/_app/AppTextInput/AppTextInputNext';
import image from '../../../assets/images/fifty-hours.svg';
import Image from '../../../components/Image/Image';

const schema = yup
  .object({
    email: emailValidator
  })
  .required();

function AccountEmailCreationView() {
  const navigate = useNavigate();
  const { send: sendActivationEmail } = useActivationEmail();

  const form = useForm<yup.InferType<typeof schema>>({
    defaultValues: {
      email: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  async function submit(values: yup.InferType<typeof schema>): Promise<void> {
    await sendActivationEmail(values.email);
    navigate('/inscription/activation', {
      state: {
        email: values.email
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Grid container xs>
          <Grid container xs={7}>
            <Grid xs={12}>
              <Stepper
                currentStep={1}
                stepCount={3}
                title="Créez votre compte"
                nextTitle="Définissez votre mot de passe"
              />
              <Typography
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  lineHeight: '1.75rem',
                  marginBottom: '0.75rem'
                }}
              >
                Pour créer votre compte sur Zéro Logement Vacant, vous devez
                déjà avoir effectué une demande d’accès au fichier LOVAC&nbsp;
                <a
                  href="https://datafoncier.cerema.fr/lovac"
                  target="_blank"
                  rel="noreferrer"
                >
                  via la procédure indiquée sur le site du Cerema
                </a>
                .
              </Typography>
            </Grid>

            <Grid xs={8} sx={{ mb: '2rem' }}>
              <AppTextInputNext
                hintText={
                  <>
                    L’adresse mail doit être autorisée à accéder aux données
                    LOVAC sur le&nbsp;
                    <a
                      href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
                      target="_blank"
                      rel="noreferrer"
                    >
                      portail Données Foncières du Cerema
                    </a>
                    .
                  </>
                }
                label="Adresse e-mail (obligatoire)"
                name="email"
                nativeInputProps={{
                  inputMode: 'email'
                }}
              />
            </Grid>

            <Grid xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button sx={{ alignSelf: 'flex-end' }} type="submit">
                Vérifier mon adresse mail
              </Button>
            </Grid>
          </Grid>

          <Grid
            sx={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}
            xs={4}
            xsOffset={1}
          >
            <Image
              alt="50 heures de travail de travail économisées en utilisant Zéro Logement Vacant"
              responsive="max-width"
              src={image}
            />
          </Grid>
        </Grid>
      </form>
    </FormProvider>
  );
}

export default AccountEmailCreationView;

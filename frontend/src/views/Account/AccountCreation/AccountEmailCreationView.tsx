import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as yup from 'yup';

import { emailValidator } from '../../../hooks/useForm';
import AppTextInputNext from '../../../components/_app/AppTextInput/AppTextInputNext';
import image from '../../../assets/images/fifty-hours.svg';
import Image from '../../../components/Image/Image';
import AppLink from '../../../components/_app/AppLink/AppLink';
import { useSendActivationEmailMutation } from '../../../services/signup-link.service';

const schema = yup
  .object({
    email: emailValidator
  })
  .required();

function AccountEmailCreationView() {
  const navigate = useNavigate();

  const [sendActivationEmail] = useSendActivationEmailMutation();

  const form = useForm<yup.InferType<typeof schema>>({
    defaultValues: {
      email: ''
    },
    mode: 'onSubmit',
    resolver: yupResolver(schema)
  });

  async function submit(values: yup.InferType<typeof schema>): Promise<void> {
    await sendActivationEmail(values.email).unwrap();
    toast.success('Email envoyé');
    navigate('/inscription/activation', {
      state: {
        email: values.email
      }
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Grid container size="grow">
          <Grid container size={7}>
            <Grid size={12}>
              <Stepper
                currentStep={1}
                stepCount={2}
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
                impérativement avoir effectué votre demande d’accès aux données
                LOVAC via&nbsp;
                <a
                  href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
                  target="_blank"
                  rel="noreferrer"
                >
                  le portail Données Foncières du Cerema
                </a>
                .
              </Typography>
            </Grid>

            <Grid sx={{ mb: '2rem' }} size={8}>
              <AppTextInputNext
                hintText={
                  <>
                    L’adresse mail doit être autorisée à accéder aux données
                    LOVAC sur&nbsp;
                    <a
                      href="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
                      target="_blank"
                      rel="noreferrer"
                    >
                      le portail Données Foncières du Cerema
                    </a>
                    .
                  </>
                }
                label="Adresse e-mail (obligatoire)"
                name="email"
                nativeInputProps={{
                  type: 'email',
                  autoComplete: 'email',
                  inputMode: 'email'
                }}
              />

              <AppLink
                isSimple
                rel="noreferrer"
                target="_blank"
                to="https://zerologementvacant.crisp.help/fr/article/comment-creer-mon-compte-zlv-1bcsydq/"
              >
                Besoin d’aide pour créer votre compte ?
              </AppLink>
            </Grid>

            <Grid
              sx={{ display: 'flex', justifyContent: 'space-between' }}
              size={12}
            >
              <Button
                iconId="fr-icon-arrow-go-back-line"
                linkProps={{
                  href: 'https://zerologementvacant.beta.gouv.fr',
                  target: '_self'
                }}
                priority="tertiary"
              >
                Retour à la page d’accueil
              </Button>

              <Button type="submit">Vérifier mon adresse mail</Button>
            </Grid>
          </Grid>

          <Grid
            sx={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}
            size={4}
            offset={1}
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

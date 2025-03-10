import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';

import { EstablishmentDTO } from '@zerologementvacant/models';
import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import building from '../../assets/images/building.svg';
import AppLink from '../../components/_app/AppLink/AppLink';
import AppTextInput from '../../components/_app/AppTextInput/AppTextInput';
import { Col, Container, Row, Text } from '../../components/_dsfr';
import EstablishmentSearchableSelect from '../../components/EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { emailValidator, useForm } from '../../hooks/useForm';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { logIn } from '../../store/thunks/auth-thunks';

const LoginView = () => {
  useDocumentTitle('Connexion');
  const dispatch = useAppDispatch();

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [establishment, setEstablishment] = useState<EstablishmentDTO | null>(
    null
  );

  const auth = useAppSelector((state) => state.authentication);

  const shape = {
    isAdmin: yup.boolean(),
    email: emailValidator,
    password: yup.string().required('Veuillez renseigner un mot de passe.'),
    establishmentId: yup.string().when('isAdmin', {
      is: true,
      then: yup.string().min(1, 'Veuillez sélectionner un établissement.')
    })
  };
  type FormShape = typeof shape;

  const form = useForm(yup.object().shape(shape), {
    isAdmin: pathname === '/admin',
    email,
    password,
    establishmentId: establishment?.id
  });

  async function submitLoginForm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await form.validate(async () => {
      try {
        await dispatch(
          logIn({
            email,
            password,
            establishmentId: establishment ? establishment.id : undefined
          })
        ).unwrap();
        navigate('/parc-de-logements');
      } catch (error) {
        console.error(error);
      }
    });
  }

  const isAdminView = pathname === '/admin';

  return (
    <Container as="main" className="grow-container" spacing="py-4w">
      <Row gutters alignItems="middle">
        <Col>
          {auth.isLoggedOut && (
            <Col n="12">
              <Alert
                title="Déconnexion"
                description="Vous êtes déconnecté. Veuillez saisir votre email et votre mot de passe pour vous connecter de nouveau."
                className="fr-my-3w"
                severity="warning"
                closable
              />
            </Col>
          )}
          {auth.logIn.isError ? (
            <Col n="12">
              <div data-testid="alert-error" className="fr-my-2w">
                <Alert
                  title="Erreur"
                  description="Échec de l’authentification"
                  severity="error"
                />
              </div>
            </Col>
          ) : null}
          <Typography component="h1" variant="h2" mb={3}>
            Connexion
          </Typography>
          <form onSubmit={submitLoginForm} id="login_form">
            <AppTextInput<FormShape>
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputForm={form}
              inputKey="email"
              whenValid="Email renseigné."
              data-testid="email-input"
              label="Adresse email (obligatoire)"
              required
            />
            <AppTextInput<FormShape>
              type="password"
              value={password}
              className={isAdminView ? '' : 'fr-mb-1w'}
              onChange={(e) => setPassword(e.target.value)}
              inputForm={form}
              inputKey="password"
              whenValid="Mot de passe renseigné."
              data-testid="password-input"
              label="Mot de passe (obligatoire)"
              required
            />
            {isAdminView && (
              <EstablishmentSearchableSelect
                className={fr.cx('fr-mb-2w')}
                label="Collectivité"
                value={establishment}
                onChange={(establishment) => {
                  if (establishment) {
                    setEstablishment(establishment);
                  }
                }}
              />
            )}
            <Row spacing="mb-4w">
              <AppLink to="/mot-de-passe/oublie" isSimple>
                Mot de passe perdu ?
              </AppLink>
            </Row>
            <Row alignItems="middle">
              <Col n="9">
                <Text as="span" size="lg">
                  Première visite ?&nbsp;
                </Text>
                <AppLink
                  to="/inscription"
                  isSimple
                  iconId="fr-icon-arrow-right-line"
                  iconPosition="right"
                >
                  Créer votre compte
                </AppLink>
              </Col>
              <Col>
                <Row justifyContent="right">
                  <Button type="submit" data-testid="login-button">
                    Se connecter
                  </Button>
                </Row>
              </Col>
            </Row>
          </form>
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img
            src={building}
            style={{ width: '100%', height: '100%' }}
            alt=""
          />
        </Col>
      </Row>
    </Container>
  );
};

export default LoginView;

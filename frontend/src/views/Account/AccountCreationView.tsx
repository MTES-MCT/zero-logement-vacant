import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { DraftUser } from '../../models/User';
import prospectService from '../../services/prospect.service';
import { createUser } from '../../store/actions/userAction';
import { login } from '../../store/actions/authenticationAction';
import * as yup from 'yup';
import {
  emailValidator,
  passwordConfirmationValidator,
  passwordValidator,
  useForm,
} from '../../hooks/useForm';
import {
  Accordion,
  AccordionItem,
  Button,
  Col,
  Container,
  Link,
  Row,
  Text,
  TextInput,
  Title,
} from '@dataesr/react-dsfr';
import CampaignIntent from '../../components/CampaignIntent/CampaignIntent';
import building from '../../assets/images/building.svg';
import Stepper from '../../components/Stepper/Stepper';
import { Prospect } from '../../models/Prospect';
import Help from '../../components/Help/Help';
import ButtonLink from '../../components/ButtonLink/ButtonLink';

function AccountCreationView() {
  const steps = {
    'fill-email': FillEmail,
    'awaiting-access': AwaitingAccess,
    'fill-password': FillPassword,
    'access-forbidden': AccessForbidden,
    'fill-campaign-intent': FillCampaignIntent,
  };
  const [step, setStep] = useState<keyof typeof steps>('fill-email');

  const dispatch = useDispatch();
  const [prospect, setProspect] = useState<Prospect>();
  const [user, setUser] = useState<DraftUser>({
    email: '',
    password: '',
    establishmentId: '',
  });

  async function onEmail(email: string): Promise<void> {
    try {
      const prospect = await prospectService.get(email);
      setProspect(prospect);
      const { establishment, hasAccount, hasCommitment } = prospect;

      if (establishment && hasAccount && hasCommitment) {
        setStep('fill-password');
        setUser({ ...user, email, establishmentId: establishment.id });
        return;
      }

      if (establishment && hasAccount && !hasCommitment) {
        setStep('awaiting-access');
        setUser({ ...user, email, establishmentId: establishment.id });
        return;
      }

      setStep('access-forbidden');
    } catch (error) {
      setStep('access-forbidden');
    }
  }

  async function onPassword(password: string): Promise<void> {
    setUser({ ...user, password });
    setStep('fill-campaign-intent');
  }

  async function onCampaignIntent(campaignIntent: string): Promise<void> {
    // Save user and remove prospect
    await dispatch(createUser({ ...user, campaignIntent }));
    setUser({ ...user, campaignIntent });
    dispatch(login(user.email, user.password, user.establishmentId));
  }

  function FillEmail({ onFillEmail }: { onFillEmail(email: string): void }) {
    const [email, setEmail] = useState('');
    const schema = yup.object().shape({ email: emailValidator });
    const { isValid, message, messageType } = useForm(schema, { email });

    async function next(): Promise<void> {
      if (isValid()) {
        onFillEmail(email);
      }
    }

    return (
      <>
        <Title as="h2">Créer votre compte</Title>
        <Text size="lead">
          Pour créer votre compte sur Zéro Logement Vacant, vous devez
          impérativement avoir déjà signé l'acte d'engagement permettant
          d'accéder aux données LOVAC via la procédure indiquée sur le site du
          Cerema.
        </Text>
        <TextInput
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          messageType={messageType('email')}
          message={message('email')}
          label="Adresse email"
          hint="Veuillez renseigner l’adresse utilisée sur Démarches Simplifiées pour transmettre l’acte d'engagement."
          required
        />
        <Row alignItems="middle" className="justify-space-between">
          <Link
            isSimple
            display="flex"
            title="Revenir à l'écran d'accueil"
            href="/"
            icon="ri-arrow-left-line"
            iconSize="1x"
            iconPosition="left"
          >
            Revenir à l'écran d'accueil
          </Link>
          <Button title="Continuer" disabled={!isValid()} onClick={next}>
            Continuer
          </Button>
        </Row>
      </>
    );
  }

  function AwaitingAccess() {
    return (
      <>
        <Title as="h2">
          Votre demande d’accès aux données LOVAC n’a pas encore été validée.
        </Title>
        <Text>
          Vous avez déjà signé et transmis l’acte d’engagement permettant
          d’accéder aux données LOVAC via la plateforme Démarches Simplifiées.
        </Text>
        <Text>
          Cependant, votre demande n’a pas encore été validée. Nous reviendrons
          très prochainement vers vous pour finaliser la création de votre
          compte.
        </Text>
        <Text className="color-grey-625">
          Attention, l’acte d’engagement n’est valable qu’un an à partir de la
          date de signature.
        </Text>
        <Link
          isSimple
          display="flex"
          title="Revenir à l'écran d'accueil"
          href="/"
          icon="ri-arrow-left-line"
          iconSize="1x"
          iconPosition="left"
        >
          Revenir à l'écran d'accueil
        </Link>
      </>
    );
  }

  function FillPassword({
    onFillPassword,
  }: {
    onFillPassword(password: string): void;
  }) {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const schema = yup.object().shape({
      password: passwordValidator,
      confirmation: passwordConfirmationValidator,
    });
    const { isValid, message, messageList, messageType } = useForm(schema, {
      password,
      confirmation,
    });

    function back() {
      setStep('fill-email');
    }

    function next() {
      if (isValid()) {
        onFillPassword(password);
      }
    }

    return (
      <>
        <Stepper
          steps={3}
          currentStep={2}
          currentTitle="Créer votre mot de passe"
          nextStepTitle="Vos intentions de campagne"
        />
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          messageType={messageType('password')}
          label="Créer votre mot de passe"
          hint="Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule et un chiffre."
          required
        />
        {messageList('password')?.map((message, i) => (
          <p className={`fr-${message.type}-text`} key={i}>
            {message.text}
          </p>
        ))}
        <TextInput
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          messageType={messageType('confirmation')}
          message={message('confirmation', 'Mots de passe identiques.')}
          label="Confirmer votre mot de passe"
          required
        />
        <Row alignItems="middle" className="justify-space-between">
          <Link
            isSimple
            display="flex"
            title="Revenir à l'étape précédente"
            href="#"
            icon="ri-arrow-left-line"
            iconSize="1x"
            iconPosition="left"
            onClick={back}
          >
            Revenir à l'étape précédente
          </Link>
          <Button title="Continuer" disabled={!isValid()} onClick={next}>
            Continuer
          </Button>
        </Row>
      </>
    );
  }

  function AccessForbidden() {
    function back() {
      setStep('fill-email');
    }

    return (
      <>
        <Title as="h2">
          Ce mail n’est pas autorisé à accéder à Zéro Logement Vacant.
        </Title>
        <Text className="color-grey-50">
          Seuls les utilisateurs autorisés à accéder aux données LOVAC peuvent
          créer un compte Zéro Logement Vacant. Vous êtes sans doute dans l’un
          des cas suivants :
        </Text>
        <Accordion className="fr-mb-4w" keepOpen>
          <AccordionItem title="Votre structure n’est pas autorisée à accéder aux données LOVAC">
            <Text className="color-grey-50" size="sm">
              Pour pouvoir accéder à Zéro Logement Vacant, vous devez signer et
              transmettre l'acte d'engagement permettant d'accéder aux données
              LOVAC en suivant la procédure indiquée sur{' '}
              <Link isSimple href="https://datafoncier.cerema.fr/" size="sm">
                le site du CEREMA
              </Link>
              .
            </Text>
            <Text className="subtitle fr-mb-0" size="sm">
              Veuillez noter que l’acte d’engagement est valable un an. Si
              celui-ci n’est plus valable, vous devez renouveler votre demande
              d’accès aux données LOVAC.
            </Text>
          </AccordionItem>
          <AccordionItem title="Votre structure est autorisée à accéder aux données LOVAC mais votre mail ne correspond pas à celui qui a été utilisé pour effectuer la demande d’accès.">
            <Text className="color-grey-50 fr-mb-0" size="sm">
              Dans ce cas,{' '}
              <ButtonLink isSimple display="inline" onClick={back} size="sm">
                réessayez avec l'adresse mail utilisée sur Démarches Simplifiées
              </ButtonLink>
              . Si vous ne savez pas quelle adresse a été utilisée, veuillez
              vous rendre sur{' '}
              <Link
                isSimple
                display="flex"
                href="https://consultdf.cerema.fr/consultdf/parcours-utilisateur/structure/"
                size="sm"
              >
                le gestionnaire de droits d’accès du Cerema pour soumettre votre
                demande.
              </Link>
            </Text>
          </AccordionItem>
          <AccordionItem title="Une ou plusieurs personnes de votre structure ont déjà accès à la solution Zéro Logement Vacant mais vous n’avez pas été rattaché comme utilisateur">
            <Text className="color-grey-50 fr-mb-0" size="sm">
              Veuillez vous rendre sur le{' '}
              <Link
                isSimple
                display="flex"
                href="https://consultdf.cerema.fr/consultdf/parcours-utilisateur/structure/"
                size="sm"
              >
                gestionnaire de droits d'accès du Cerema
              </Link>{' '}
              pour soumettre votre demande d'accès aux données foncières avec
              votre mail, puis demandez à l'administrateur de votre structure
              d'accepter votre demande d'accès.
            </Text>
          </AccordionItem>
        </Accordion>
        <Link
          isSimple
          display="flex"
          title="Revenir à l'écran d'accueil"
          href="/"
          icon="ri-arrow-left-line"
          iconSize="1x"
          iconPosition="left"
        >
          Revenir à l'écran d'accueil
        </Link>
      </>
    );
  }

  function FillCampaignIntent({
    onFillCampaignIntent,
  }: {
    onFillCampaignIntent(intent: string): void;
  }) {
    const [campaignIntent, setCampaignIntent] = useState<string | undefined>(
      prospect?.establishment?.campaignIntent
    );
    const schema = yup.object().shape({
      campaignIntent: yup.string().required().oneOf(['0-2', '2-4', '4+']),
    });
    const { isValid, message, messageType } = useForm(schema, {
      campaignIntent,
    });

    function back() {
      setStep('fill-password');
    }

    async function createAccount() {
      if (isValid()) {
        onFillCampaignIntent(campaignIntent as string);
      }
    }

    const disabled = useMemo<boolean>(
      () => !!prospect?.establishment?.campaignIntent,
      []
    );

    return (
      <>
        <Stepper
          steps={3}
          currentStep={3}
          currentTitle="Vos intentions de campagne"
          nextStepTitle=""
        />
        <Title as="h5">
          Quand prévoyez-vous de contacter des propriétaires de logements
          vacants ?
        </Title>
        {disabled && (
          <Help className="fr-mb-2w">
            Un agent de votre collectivité a déjà indiqué les intentions de
            campagne.
          </Help>
        )}
        <CampaignIntent
          defaultValue={prospect?.establishment?.campaignIntent}
          disabled={disabled}
          message={message('campaignIntent')}
          messageType={messageType('campaignIntent')}
          onChange={setCampaignIntent}
        />
        <Row alignItems="middle" className="justify-space-between">
          <Link
            isSimple
            display="flex"
            title="Revenir à l'étape précédente"
            href="#"
            icon="ri-arrow-left-line"
            iconSize="1x"
            iconPosition="left"
            onClick={back}
          >
            Revenir à l'étape précédente
          </Link>
          <Button
            title="Créer votre compte"
            disabled={!isValid()}
            onClick={createAccount}
          >
            Créer votre compte
          </Button>
        </Row>
      </>
    );
  }

  const Component = steps[step];
  return (
    <Container as="main" spacing="py-7w mb-4w">
      <Row gutters>
        <Col n="6">
          <Component
            onFillEmail={onEmail}
            onFillPassword={onPassword}
            onFillCampaignIntent={onCampaignIntent}
          />
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img
            src={building}
            style={{ maxWidth: '100%', height: '100%' }}
            alt=""
          />
        </Col>
      </Row>
    </Container>
  );
}

export default AccountCreationView;

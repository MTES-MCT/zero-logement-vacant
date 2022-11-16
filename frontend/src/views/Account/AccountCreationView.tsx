import React, { ChangeEvent, useState } from "react";
import { useDispatch } from "react-redux";
import { DraftUser } from "../../models/User";
import prospectService from "../../services/prospect.service";
import { createUser } from "../../store/actions/userAction";
import { login } from "../../store/actions/authenticationAction";
import * as yup from "yup";
import {
  emailValidator,
  passwordConfirmationValidator,
  passwordValidator,
  useForm
} from "../../hooks/useForm";
import {
  Button,
  Col,
  Container,
  Link,
  Row,
  Stepper,
  Text,
  TextInput,
  Title
} from "@dataesr/react-dsfr";
import CampaignIntent from "../../components/CampaignIntent/CampaignIntent";
import building from "../../assets/images/building.svg";

function AccountCreationView() {
  const steps = {
    'fill-email': FillEmail,
    'awaiting-access': AwaitingAccess,
    'fill-password': FillPassword,
    'access-forbidden': AccessForbidden,
    'fill-campaign-intent': FillCampaignIntent
  }
  const [step, setStep] = useState<keyof typeof steps>('fill-email')

  const dispatch = useDispatch()
  const [user, setUser] = useState<DraftUser>({
    email: '',
    password: '',
    establishmentId: '',
  })

  async function onEmail(email: string): Promise<void> {
    try {
      const { establishment, hasAccount, hasCommitment } = await prospectService.get(email)

      if (establishment && hasAccount && hasCommitment) {
        setStep('fill-password')
        setUser({ ...user, email, establishmentId: establishment.id })
        return
      }

      if (establishment && hasAccount && !hasCommitment) {
        setStep('awaiting-access')
        setUser({ ...user, email, establishmentId: establishment.id })
        return
      }

      setStep('access-forbidden')
    } catch (error) {
      setStep('access-forbidden')
    }
  }

  async function onPassword(password: string): Promise<void> {
    setUser({ ...user, password })
    setStep('fill-campaign-intent')
  }

  async function onCampaignIntent(campaignIntent: string): Promise<void> {
    // Save user and remove prospect
    await dispatch(createUser({ ...user, campaignIntent }))
    setUser({ ...user, campaignIntent })
    dispatch(login(user.email, user.password, user.establishmentId))
  }

  function FillEmail({ onFillEmail }: { onFillEmail(email: string): void }) {
    const [email, setEmail] = useState('')
    const schema = yup.object().shape({ email: emailValidator })
    const { isValid, message, messageType } = useForm(schema, { email })

    async function next(): Promise<void> {
      if (isValid()) {
        onFillEmail(email)
      }
    }

    return (
      <>
        <Title as="h2">Créer votre compte</Title>
        <Text size="lead">
          Pour créer votre compte sur Zéro Logement Vacant, vous devez
          impérativement avoir déjà signé l'acte d'engagement permettant d'accéder
          aux données LOVAC via la procédure indiquée sur le site du Cerema.
        </Text>
        <TextInput
          type="text"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
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
          <Button title="Continuer" disabled={!isValid()} onClick={next}>Continuer</Button>
        </Row>
      </>
    )
  }

  function AwaitingAccess() {
    return (
      <>
        <Title as="h2">
          Votre demande d’accès aux données LOVAC n’a pas encore été validée
        </Title>
        <Text>
          Vous avez déjà signé et transmis l’acte d’engagement
          permettant d’accéder aux données LOVAC via la plateforme
          Démarches Simplifiées.
        </Text>
        <Text>
          Cependant, votre demande n’a pas encore
          été validée. Nous reviendrons très prochainement vers vous
          pour finaliser la création de votre compte.
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
    )
  }

  function FillPassword({ onFillPassword }: { onFillPassword(password: string): void }) {
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const schema = yup.object().shape({
      password: passwordValidator,
      confirmation: passwordConfirmationValidator
    })
    const { isValid, message, messageType } = useForm(schema, {
      password,
      confirmation
    })

    function back() {
      setStep('fill-email')
    }

    function next() {
      if (isValid()) {
        onFillPassword(password)
      }
    }

    return (
      <>
        <Stepper
          steps={3}
          currentStep={2}
          nextStep={3}
          currentTitle="Créer votre mot de passe"
          nextStepTitle="Vos intentions de campagne"
        />
        <TextInput
          type="password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          messageType={messageType('password')}
          message={message('password')}
          label="Créer votre mot de passe"
          hint="Le mot de passe doit contenir 8 caractères avec au moins une majuscule, une minuscule et un chiffre."
          required
        />
        <TextInput
          type="password"
          value={confirmation}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmation(e.target.value)}
          messageType={messageType('confirmation')}
          message={message('confirmation')}
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
    )
  }

  function AccessForbidden() {
    function back() {
      setStep('fill-email')
    }

    return (
      <>
        <Title as="h2">
          Vous n’avez pas signé et transmis l’acte d’engagement
          permettant d’accéder aux données LOVAC
        </Title>
        <Text>
          Vous n’avez pas l’autorisation d’accéder aux données
          LOVAC. Veuillez signer et transmettre l’acte d’engagement
          permettant d’accéder à ces données en suivant la procédure
          indiquée sur le site du Cerema.
        </Text>
        <Text>
          Vous avez peut être signé et transmis l’acte d’engagement
          permettant d’accéder aux données LOVAC via une adresse mail
          différente. Dans ce cas, <Link title="Modifier l'adresse email" href="#" isSimple onClick={back}>
          réessayez avec l’adresse mail utilisée sur Démarches Simplifiées.
        </Link>
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
    )
  }

  function FillCampaignIntent({ onFillCampaignIntent }: { onFillCampaignIntent(intent: string): void }) {
    const [campaignIntent, setCampaignIntent] = useState<string>()
    const schema = yup.object().shape({
      campaignIntent: yup.string().required().oneOf(['0-2', '2-4', '4+'])
    })
    const { isValid, message, messageType } = useForm(schema, {
      campaignIntent
    })

    function back() {
      setStep('fill-password')
    }

    async function createAccount() {
      if (isValid()) {
        onFillCampaignIntent(campaignIntent as string)
      }
    }

    return (
      <>
        <Stepper
          steps={3}
          currentStep={3}
          currentTitle="Vos intentions de campagne"
          nextStepTitle=""
        />
        <Title as="h5">
          Quand prévoyez-vous de contacter des propriétaires de logements vacants ?
        </Title>
        <CampaignIntent
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
          <Button title="Créer votre compte" disabled={!isValid()} onClick={createAccount}>
            Créer votre compte
          </Button>
        </Row>
      </>
    )
  }

  const Component = steps[step]
  return (
    <Container spacing="py-7w mb-4w">
      <Row gutters>
        <Col n="6">
          <Component
            onFillEmail={onEmail}
            onFillPassword={onPassword}
            onFillCampaignIntent={onCampaignIntent}
          />
        </Col>
        <Col n="5" offset="1" className="align-right">
          <img src={building} style={{maxWidth: "100%", height: "100%"}} alt=""/>
        </Col>
      </Row>
    </Container>
  )
}

export default AccountCreationView

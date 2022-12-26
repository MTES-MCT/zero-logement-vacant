import React, { useEffect, useMemo, useState } from 'react';
import * as yup from 'yup';
import { useForm } from '../../../hooks/useForm';
import Stepper from '../../../components/Stepper/Stepper';
import { Button, Link, Row, Title } from '@dataesr/react-dsfr';
import Help from '../../../components/Help/Help';
import CampaignIntent from '../../../components/CampaignIntent/CampaignIntent';
import { Redirect, useHistory } from 'react-router-dom';
import { createUser } from '../../../store/actions/userAction';
import { login } from '../../../store/actions/authenticationAction';
import prospectService from '../../../services/prospect.service';
import { Prospect } from '../../../models/Prospect';
import { useDispatch } from 'react-redux';

interface State {
  email: string;
  password: string;
}

function AccountCampaignIntentCreationView() {
  const dispatch = useDispatch();
  const router = useHistory<State | undefined>();
  const { location } = router;

  const [prospect, setProspect] = useState<Prospect>();
  const [campaignIntent, setCampaignIntent] = useState<string | undefined>();

  const schema = yup.object().shape({
    campaignIntent: yup.string().required().oneOf(['0-2', '2-4', '4+']),
  });
  const { isValid, message, messageType } = useForm(schema, {
    campaignIntent,
  });

  function back() {
    router.goBack();
  }

  const disabled = useMemo<boolean>(
    () => !!prospect?.establishment?.campaignIntent,
    [prospect?.establishment?.campaignIntent]
  );

  useEffect(() => {
    if (location.state?.email) {
      prospectService.get(location.state.email).then((prospect) => {
        setProspect(prospect);
        setCampaignIntent(prospect.establishment?.campaignIntent);
      });
    }
  }, [location.state, setProspect]);

  async function createAccount() {
    if (isValid() && prospect?.establishment) {
      // Save user and remove prospect
      await dispatch(
        createUser({
          email: location.state!.email,
          password: location.state!.password,
          establishmentId: prospect.establishment.id,
          campaignIntent,
        })
      );
      dispatch(
        login(
          location.state!.email,
          location.state!.password,
          prospect.establishment.id
        )
      );
    }
  }

  if (!location.state || !location.state?.email || !location.state?.password) {
    return <Redirect to="/inscription/email" />;
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
        Quand prévoyez-vous de contacter des propriétaires de logements vacants
        ?
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

export default AccountCampaignIntentCreationView;

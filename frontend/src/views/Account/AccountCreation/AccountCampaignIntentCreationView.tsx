import React, { FormEvent, useMemo, useState } from 'react';
import { Location } from 'history';
import * as yup from 'yup';
import { useForm } from '../../../hooks/useForm';
import Stepper from '../../../components/Stepper/Stepper';
import { Row, Title } from '../../../components/_dsfr/index';
import Help from '../../../components/Help/Help';
import CampaignIntent from '../../../components/CampaignIntent/CampaignIntent';
import { Redirect, useHistory } from 'react-router-dom';
import { login } from '../../../store/actions/authenticationAction';
import { Prospect } from '../../../models/Prospect';
import AppLink from '../../../components/_app/AppLink/AppLink';
import { useAppDispatch } from '../../../hooks/useStore';
import { useCreateUserMutation } from '../../../services/user.service';
import Button from '@codegouvfr/react-dsfr/Button';

interface State {
  prospect: Prospect;
  password: string;
}

function AccountCampaignIntentCreationView() {
  const dispatch = useAppDispatch();
  const router = useHistory<State | undefined>();
  const { location } = router;
  const prospect = location.state?.prospect;
  const password = location.state?.password;

  const [campaignIntent, setCampaignIntent] = useState<string | undefined>(
    prospect?.establishment?.campaignIntent
  );

  const [createUser] = useCreateUserMutation();

  const schema = yup.object().shape({
    campaignIntent: yup.string().required().oneOf(['0-2', '2-4', '4+']),
  });
  const { isValid, message, messageType } = useForm(schema, {
    campaignIntent,
  });

  const disabled = useMemo<boolean>(
    () => !!prospect?.establishment?.campaignIntent,
    [prospect?.establishment?.campaignIntent]
  );

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    if (isValid() && prospect && password && prospect.establishment) {
      // Save user and remove prospect
      await createUser({
        email: prospect.email,
        password,
        establishmentId: prospect.establishment.id,
        campaignIntent,
      });
      dispatch(login(prospect.email, password, prospect.establishment.id));
    }
  }

  const back: Location = {
    pathname: '/inscription/mot-de-passe',
    state: {
      prospect,
    },
    hash: '',
    search: '',
  };

  if (!location.state || !prospect || !password) {
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
      <form onSubmit={createAccount}>
        <CampaignIntent
          defaultValue={prospect?.establishment?.campaignIntent}
          disabled={disabled}
          message={message('campaignIntent')}
          messageType={messageType('campaignIntent')}
          onChange={setCampaignIntent}
        />
        <Row alignItems="middle" className="justify-space-between">
          {/*@ts-ignore*/}
          <AppLink
            isSimple
            to={back}
            iconId="fr-icon-arrow-left-line"
            iconPosition="left"
          >
            Revenir à l’étape précédente
          </AppLink>
          <Button type="submit" disabled={!isValid()}>
            Créer votre compte
          </Button>
        </Row>
      </form>
    </>
  );
}

export default AccountCampaignIntentCreationView;

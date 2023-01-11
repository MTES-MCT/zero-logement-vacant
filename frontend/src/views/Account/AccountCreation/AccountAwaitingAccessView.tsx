import { Text, Title } from '@dataesr/react-dsfr';
import React from 'react';
import InternalLink from '../../../components/InternalLink/InternalLink';

function AccountAwaitingAccessView() {
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
        très prochainement vers vous pour finaliser la création de votre compte.
      </Text>
      <Text className="color-grey-625">
        Attention, l’acte d’engagement n’est valable qu’un an à partir de la
        date de signature.
      </Text>
      <InternalLink
        isSimple
        display="flex"
        to="/"
        icon="ri-arrow-left-line"
        iconSize="1x"
        iconPosition="left"
      >
        Revenir à l'écran d'accueil
      </InternalLink>
    </>
  );
}

export default AccountAwaitingAccessView;

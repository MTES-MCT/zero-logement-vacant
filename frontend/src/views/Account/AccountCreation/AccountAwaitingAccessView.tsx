import { Container, Text, Title } from '../../../components/dsfr/index';
import React from 'react';
import AppLink from '../../../components/AppLink/AppLink';

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
      <Container as="section" fluid spacing="mb-4w">
        <AppLink
          to="https://zerologementvacant.crisp.help/fr/category/1-creer-et-gerer-un-compte-1nni4io/"
          isSimple
          size="sm"
        >
          Besoin d’aide pour créer votre compte ?
        </AppLink>
      </Container>
      <AppLink
        isSimple
        to="/"
        iconId="fr-icon-arrow-left-line"
        iconPosition="left"
      >
        Revenir à l'écran d'accueil
      </AppLink>
    </>
  );
}

export default AccountAwaitingAccessView;

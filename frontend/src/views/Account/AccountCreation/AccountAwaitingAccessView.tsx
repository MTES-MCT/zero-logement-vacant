import { Container, Text } from '../../../components/_dsfr';
import AppLink from '../../../components/_app/AppLink/AppLink';
import Typography from '@mui/material/Typography';

function AccountAwaitingAccessView() {
  return (
    <>
      <Typography variant="h2" mb={3}>
        Votre demande d’accès aux données LOVAC n’a pas encore été validée.
      </Typography>
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
        Revenir à l’écran d’accueil
      </AppLink>
    </>
  );
}

export default AccountAwaitingAccessView;

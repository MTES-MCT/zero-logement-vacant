import { Container, Text } from '../../../components/_dsfr';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import { fr } from '@codegouvfr/react-dsfr';
import classNames from 'classnames';
import AppLink from '../../../components/_app/AppLink/AppLink';
import Typography from '@mui/material/Typography';

function AccountAccessForbiddenView() {
  return (
    <>
      <Typography variant="h2" mb={3}>
        Ce mail n’est pas autorisé à accéder à Zéro Logement Vacant.
      </Typography>
      <Text className="color-grey-50">
        Seuls les utilisateurs autorisés à accéder aux données LOVAC peuvent
        créer un compte Zéro Logement Vacant. Vous êtes sans doute dans l’un des
        cas suivants :
      </Text>
      <div className={classNames(fr.cx('fr-accordions-group'), 'fr-mb-2w')}>
        <Accordion label="Votre structure n’est pas autorisée à accéder aux données LOVAC">
          <Text className="color-grey-50" size="sm">
            Pour pouvoir accéder à Zéro Logement Vacant, vous devez signer et
            transmettre l’acte d’engagement permettant d’accéder aux données
            LOVAC en suivant la procédure indiquée sur 
            <AppLink
              isSimple
              to="https://datafoncier.cerema.fr/lovac"
              size="sm"
            >
              le site du CEREMA
            </AppLink>
            .
          </Text>
          <Text className="subtitle fr-mb-0" size="sm">
            Veuillez noter que l’acte d’engagement est valable un an. Si
            celui-ci n’est plus valable, vous devez renouveler votre demande
            d’accès aux données LOVAC.
          </Text>
        </Accordion>
        <Accordion label="Votre structure est autorisée à accéder aux données LOVAC mais votre mail ne correspond pas à celui qui a été utilisé pour effectuer la demande d’accès.">
          <Text className="color-grey-50 fr-mb-0" size="sm">
            Dans ce cas, 
            <AppLink isSimple to="/inscription/email" size="sm">
              réessayez avec l’adresse mail utilisée sur Démarches Simplifiées
            </AppLink>
            . Si vous ne savez pas quelle adresse a été utilisée, veuillez vous
            rendre sur 
            <AppLink
              isSimple
              to="https://consultdf.cerema.fr/consultdf/parcours-utilisateur/structure/"
              size="sm"
            >
              le gestionnaire de droits d’accès du Cerema pour soumettre votre
              demande.
            </AppLink>
          </Text>
        </Accordion>
        <Accordion label="Une ou plusieurs personnes de votre structure ont déjà accès à la solution Zéro Logement Vacant mais vous n’avez pas été rattaché comme utilisateur">
          <Text className="color-grey-50 fr-mb-0" size="sm">
            Veuillez vous rendre sur le 
            <AppLink
              isSimple
              to="https://consultdf.cerema.fr/consultdf/parcours-utilisateur/structure/"
              size="sm"
            >
              gestionnaire de droits d’accès du Cerema
            </AppLink>
             pour soumettre votre demande d’accès aux données foncières avec
            votre mail, puis demandez à l’administrateur de votre structure
            d’accepter votre demande d’accès.
          </Text>
        </Accordion>
      </div>
      <Container as="section" fluid spacing="mb-4w">
        <AppLink
          to="https://zerologementvacant.crisp.help/fr/article/comment-creer-mon-compte-zlv-1bcsydq"
          target="_blank"
          isSimple
          size="sm"
        >
          Besoin d’aide pour créer votre compte ?
        </AppLink>
      </Container>
      <AppLink
        isSimple
        title="Revenir à l'écran d'accueil"
        to="/"
        iconId="fr-icon-arrow-left-line"
        iconPosition="left"
      >
        Revenir à l’écran d’accueil
      </AppLink>
    </>
  );
}

export default AccountAccessForbiddenView;

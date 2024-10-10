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
        Seules les personnes membres des structures ayant droit d‘accéder aux données LOVAC - les collectivités territoriales, les EPCI à fiscalité propre et les services de l‘Etat, ainsi que leurs partenaires - peuvent créer un compte ZLV. Si vous êtes membre d‘une de ces structures mais que vous ne parvenez pas à créer votre compte, vous êtes donc sans doute dans l’un des cas suivants :
      </Text>
      <div className={classNames(fr.cx('fr-accordions-group'), 'fr-mb-2w')}>
        <Accordion label="Votre structure n'est pas enregistrée comme bénéficiaire des données LOVAC sur le portail Données Foncières">
          <Text className="color-grey-50" size="sm">
            Pour pouvoir accéder à Zéro Logement Vacant, vous devez effectuer une demande d‘accès aux données LOVAC via le 
            <AppLink
              isSimple
              to="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
              size="sm"
            >
              portail Données Foncières du Cerema
            </AppLink>
             . Pour cela, créez votre compte sur ce portail et effectuez une demande d‘accès au niveau 3 - LOVAC. Si votre accès a expiré, demandez à prolonger votre accès sur le portail.
          </Text>
        </Accordion>
        <Accordion label="Votre structure est enregistrée comme bénéficiaire des données LOVAC mais votre mail n'est pas rattaché à la structure sur le portail Données Foncières">
          <Text className="color-grey-50 fr-mb-0" size="sm">
            Dans ce cas, créez votre compte sur le 
            <AppLink
              isSimple
              to="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
              size="sm"
            >
              portail Données Foncières du Cerema
            </AppLink>
             et effectuez une demande de rattachement à votre structure. C‘est la personne gestionnaire de la structure qui pourra valider votre demande de rattachement via ce même portail.
          </Text>
        </Accordion>
        <Accordion label="Votre mail est rattaché à la structure mais vous n'avez pas créé votre propre compte utilisateur sur le portail Données Foncières">
          <Text className="color-grey-50 fr-mb-0" size="sm">
            Vous devez impérativement avoir créé un compte sur le 
            <AppLink
              isSimple
              to="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
              size="sm"
            >
              portail Données Foncières du Cerema
            </AppLink>
             pour pouvoir créer un compte ZLV. Validez les Conditions Générales d‘Utilisation pour finaliser la création de votre compte utilisateur et obtenir l‘autorisation de créer votre compte ZLV.
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

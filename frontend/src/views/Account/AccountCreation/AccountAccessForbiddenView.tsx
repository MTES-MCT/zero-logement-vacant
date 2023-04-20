import {
  Accordion,
  AccordionItem,
  Container,
  Link,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import ButtonLink from '../../../components/ButtonLink/ButtonLink';
import React from 'react';
import { useHistory } from 'react-router-dom';

function AccountAccessForbiddenView() {
  const router = useHistory();

  function back() {
    router.push('/inscription/email');
  }

  return (
    <>
      <Title as="h2">
        Ce mail n’est pas autorisé à accéder à Zéro Logement Vacant.
      </Title>
      <Text className="color-grey-50">
        Seuls les utilisateurs autorisés à accéder aux données LOVAC peuvent
        créer un compte Zéro Logement Vacant. Vous êtes sans doute dans l’un des
        cas suivants :
      </Text>
      <Accordion className="fr-mb-2w" keepOpen>
        <AccordionItem title="Votre structure n’est pas autorisée à accéder aux données LOVAC">
          <Text className="color-grey-50" size="sm">
            Pour pouvoir accéder à Zéro Logement Vacant, vous devez signer et
            transmettre l'acte d'engagement permettant d'accéder aux données
            LOVAC en suivant la procédure indiquée sur 
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
            Dans ce cas, 
            <ButtonLink isSimple display="inline" onClick={back} size="sm">
              réessayez avec l'adresse mail utilisée sur Démarches Simplifiées
            </ButtonLink>
            . Si vous ne savez pas quelle adresse a été utilisée, veuillez vous
            rendre sur 
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
            Veuillez vous rendre sur le 
            <Link
              isSimple
              display="flex"
              href="https://consultdf.cerema.fr/consultdf/parcours-utilisateur/structure/"
              size="sm"
            >
              gestionnaire de droits d'accès du Cerema
            </Link>
             pour soumettre votre demande d'accès aux données foncières avec
            votre mail, puis demandez à l'administrateur de votre structure
            d'accepter votre demande d'accès.
          </Text>
        </AccordionItem>
      </Accordion>
      <Container as="section" fluid spacing="mb-4w">
        <Link
          href="https://zerologementvacant.crisp.help/fr/category/1-creer-et-gerer-un-compte-1nni4io/"
          isSimple
          size="sm"
        >
          Besoin d’aide pour créer votre compte ?
        </Link>
      </Container>
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

export default AccountAccessForbiddenView;

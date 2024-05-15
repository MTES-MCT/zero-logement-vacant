import { Container, Text, Title } from '../../components/_dsfr';
import MainContainer from '../../components/MainContainer/MainContainer';
import AppLink from '../../components/_app/AppLink/AppLink';

function LegalNoticesView() {
  return (
    <MainContainer title="Mentions Légales">
      <Container as="article" spacing="mb-7w px-0">
        <Title as="h3" spacing="mt-4w">
          Éditeur du site
        </Title>
        <Text spacing="mb-0">Ministère de la Transition écologique (MTE)</Text>
        <Text spacing="mb-0">
          Direction générale de l’Aménagement, du Logement et de la Nature
          (DGALN)
        </Text>
        <Text>
          Direction de l’habitat, de l’urbanisme et des paysages (DHUP)
        </Text>
        <Text spacing="mb-0">1 place Carpeaux, 92800 Puteaux, France</Text>
        <Text>+33 1 40 81 21 22</Text>
        <Text>
          Directeur de publication : Damien Botteghi, directeur de l’Habitat, de
          l’Urbanisme et des Paysages
        </Text>
        <Title as="h3" spacing="mt-4w">
          Prestataire d’hébergement
        </Title>
        <Text spacing="mb-0">SCALINGO SAS</Text>
        <Text spacing="mb-0">15 avenue du Rhin </Text>
        <Text spacing="mb-0">67100 Strasbourg</Text>
      </Container>
      <Container as="article" spacing="mb-7w px-0">
        <Title as="h2">Conditions générales d’utilisation</Title>
        <Text>
          Zéro Logement Vacant est un service numérique du Ministère de la
          Transition écologique.
        </Text>

        <Title as="h3" spacing="mt-4w">
          1. Présentation du service
        </Title>
        <Text>
          Zéro Logement Vacant est un service numérique de l’administration
          permettant à l’Utilisateur d’identifier les propriétaires de logement
          vacant en France, d’organiser et formaliser une campagne de prise de
          contact des propriétaires de logements vacants et de suivre
          l’évolution de ces logements dans le temps.
        </Text>
        <Text>
          Cette démarche de lutte contre la vacance contribue à la rénovation
          énergétique des bâtiments, aux objectifs de zéro artificialisation
          nette des sols et à la redynamisation des centralités.
        </Text>
        <Text>
          Ce service est destiné aux EPCI, aux communes et aux opérateurs du
          logement (opérateurs Anah, AIVS, AIS, …).
        </Text>
        <Text>
          Les présentes Conditions générales d’utilisation ont pour objet de
          régler les relations entre les différents intervenants sur le service.
          Elles définissent les conditions et modalités d’utilisation des
          services.
        </Text>
        <Text>
          Le service est développé et opéré par le Ministère de la Transition
          écologique.
        </Text>
        <Text>
          L’utilisation du service est libre, facultative et gratuite.
        </Text>
        <Text>
          Toute utilisation du service est subordonnée à l’acceptation préalable
          et au respect intégral des présentes Conditions générales
          d’utilisation (CGU) par l’utilisateur.
        </Text>
        <Title as="h3" spacing="mt-4w">
          2. Définitions
        </Title>
        <Text>
          L’Éditeur : La personne, physique ou morale, qui édite les services de
          communication au public en ligne.
        </Text>
        <Text>
          Le Site : se réfère indistinctement à l’application web et à
          l’interface de programmation applicative (API) ayant pour adresse
          https://zerologementvacant.beta.gouv.fr/.
        </Text>
        <Text>
          L’Utilisateur : La personne utilisant le Site et les services.
        </Text>

        <Title as="h3" spacing="mt-4w">
          3. Objet
        </Title>
        <Text>
          Le service est composé d’une application web qui permet à
          l’Utilisateur :
        </Text>
        <ul>
          <li>
            de repérer les logements vacants sur leur territoire grâce aux
            données LOVAC ;
          </li>
        </ul>
        <ul>
          <li>
            de cibler des logements prioritaires et d’entrer en contact avec
            leurs propriétaires pour les informer des aides à la remise sur le
            marché ;
          </li>
        </ul>
        <ul>
          <li>
            de mettre à jour les fiches de suivi des logements vacants et des
            propriétaires ;
          </li>
        </ul>
        <ul>
          <li>
            d’intégrer ses périmètres géographiques d’intervention opérationnels
            (OPAH, OPAH-RU, OPAH-RR, PIG, etc.).
          </li>
        </ul>
        <Text>
          L’utilisation du service nécessite une inscription et une
          identification préalable sur le site de Zéro Logement Vacant ainsi
          qu’une demande d’autorisation aux données LOVAC sur le site du CEREMA.
          Les données de l’Utilisateur sont utilisées conformément aux
          dispositions de la partie « 6 ».
        </Text>
        <Text>
          L’Utilisateur s’engage à ne pas fournir de fausses informations
          nominatives et à ne pas créer de compte pour une autre personne sans
          son autorisation. Par ailleurs, il s’engage à s’assurer de
          l’exactitude des informations relatives à ses coordonnées, en les
          mettant à jour dès que nécessaire.
        </Text>
        <Text>
          Pour profiter du service offert, l’Utilisateur accepte de renseigner
          des données le concernant, et en particulier son nom et prénom, email,
          téléphone, et son poste dans la collectivité.
        </Text>

        <Title as="h3" spacing="mt-4w">
          4. Obligations de l&#x27;Utilisateur
        </Title>
        <Text>
          De manière générale, et sans que cette liste puisse être considérée
          comme exhaustive, l’Utilisateur s’interdit de :
        </Text>
        <ul>
          <li>
            fournir volontairement des informations incomplètes, erronées ou
            inexactes, ou dont il n’est pas titulaire ou détenteur légitime ;
          </li>
        </ul>
        <ul>
          <li>
            utiliser le Site ou le Service à des fins commerciales ou privées,
            ou dans des conditions ou selon des modalités qui entraîneraient la
            violation par lui d’autres dispositions ou engagements contractuels
            ou constitutives d’une fraude ;
          </li>
        </ul>
        <ul>
          <li>entraver ou perturber le fonctionnement du Site ;</li>
        </ul>
        <ul>
          <li>
            déposer, diffuser ou utiliser sur ou depuis le Site des contenus
            portant atteinte aux droits de tiers, et en particulier à des droits
            de propriété intellectuelle (marque, droit d’auteur, modèles en
            particulier), aux droits de personne (notamment usurpation
            d’identité, diffamation, insultes, injures, dénigrement,
            harcèlement, etc.), au respect de la vie privée (en ce compris le
            droit à l’image), à l’ordre public et aux bonnes mœurs (notamment
            apologie des crimes contre l’humanité, incitation à la haine
            raciale, atteinte à la dignité humaine, etc.) et, plus généralement,
            à la réglementation applicable en vigueur et aux règles habituelles
            en matière de pratiques commerciales, de politesse et de courtoisie,
            en particulier dans ses échanges avec le support.
          </li>
        </ul>

        <Title as="h3" spacing="mt-4w">
          5. Qualité des données publiées
        </Title>
        <Text>
          Nous donnons accès sur Zéro Logement Vacant à des données publiques à
          titre informatif. Seules les publications légales font foi, notamment
          au Journal officiel de la République française ou aux recueils des
          actes administratifs des préfectures.
        </Text>
        <Text>
          Par conséquent, les données accessibles sur le Site ne sauraient
          engager la responsabilité de leur éditeur ou d’un quelconque service
          de l’État, l’utilisateur y ayant recours en ayant conscience des
          potentielles erreurs ou omissions qu’elles peuvent comporter.
        </Text>
        <Text>
          Nous nous efforçons de livrer des données de la meilleure qualité
          possible. Toutefois, malgré toute notre attention, elles peuvent
          encore comporter des erreurs ou omissions. Si vous constatez une
          erreur ou omission parmi ces données, nous vous invitons à nous la
          signaler par courriel à l’adresse 
          <AppLink to="mailto:zlv@beta.gouv.fr">zlv@beta.gouv.fr</AppLink>.
        </Text>

        <Title as="h3" spacing="mt-4w">
          6. Propriété intellectuelle
        </Title>
        <Text>
          Ce site est la propriété exclusive du Ministère de la Transition
          écologique. Toute reproduction ou représentation totale ou partielle
          de ce site par quelque procédé que ce soit, sans l&#x27;autorisation
          expresse de son propriétaire est interdite et constituerait une
          contrefaçon sanctionnée par les articles L. 335-2 du Code de la
          propriété intellectuelle.
        </Text>
        <Text>
          Si vous souhaitez reproduire ou réutiliser des contenus présents sur
          ce site, veuillez nous contacter à l’adresse 
          <AppLink to="mailto:zlv@beta.gouv.fr">zlv@beta.gouv.fr</AppLink> pour
          connaître les conditions de réutilisation applicables.
        </Text>
        <Text>
          Les marques dont est titulaire le ministère de la Transition
          écologique, ainsi que ses logos figurant sur le site sont des marques
          régulièrement déposées auprès de l’Institut national de la propriété
          industrielle (INPI). Toute reproduction totale ou partielle de ces
          marques ou de ces logos effectuées à partir des éléments du site sans
          l’autorisation expresse du propriétaire de ce site est prohibée au
          sens des articles L. 713-2 et suivants du Code de la propriété
          intellectuelle. Tout contrefacteur s’expose aux sanctions prévues aux
          articles L. 716-1 et suivants du code de la propriété intellectuelle.
        </Text>

        <Text bold>Code source</Text>
        <Text>
          Le code source de l’application web et de l’interface de programmation
          applicative (API) sont libres et peuvent donc être vérifiés et
          améliorés par chacun dans les conditions précisées par la licence MIT
          (
          <AppLink to="https://mit-license.org/">
            https://mit-license.org/
          </AppLink>
          ).
        </Text>
        <Text>Ils sont disponibles sur Github à ces adresses :</Text>
        <ul>
          <li>
            interface utilisateur – UI : 
            <AppLink to="https://github.com/MTES-MCT/zero-logement-vacant/tree/main/frontend">
              https://github.com/MTES-MCT/zero-logement-vacant/tree/main/frontend
            </AppLink>
          </li>
        </ul>
        <ul>
          <li>
            interface de programmation applicative – API : 
            <AppLink to="https://github.com/MTES-MCT/zero-logement-vacant/tree/main/server">
              https://github.com/MTES-MCT/zero-logement-vacant/tree/main/server
            </AppLink>
          </li>
        </ul>

        <Title as="h3" spacing="mt-4w">
          7. Limitation de la responsabilité
        </Title>
        <Text>
          Zéro Logement Vacant ne saurait être tenu responsable des éventuelles
          difficultés de fonctionnement du service, ni être engagé directement
          ou indirectement vis-à-vis des utilisateurs pour tout incident tenant
          au fonctionnement de service.
        </Text>
        <Text>
          Nous nous engageons à protéger vos données, toutefois cet engagement
          ne saurait être assimilé à une reconnaissance de faute ou de
          responsabilité en cas d’incident relatif à une faille de sécurité.
        </Text>

        <Title as="h3" spacing="mt-4w">
          8. Suppression du compte en cas de violation des CGU
        </Title>
        <Text>
          En cas de violation d&#x27;une ou de plusieurs dispositions des CGU ou
          de tout autre document incorporé aux présentes par référence,
          l’Éditeur se réserve le droit de mettre fin ou restreindre sans aucun
          avertissement préalable et à sa seule discrétion, votre usage et accès
          aux services, à votre compte et à tous les Sites.
        </Text>

        <Title as="h3" spacing="mt-4w">
          9. Disponibilité du service
        </Title>
        <Text>
          L&#x27;Éditeur peut suspendre l’accès à Zéro Logement Vacant sans
          information préalable ni préavis, notamment pour des raisons de
          maintenance. L&#x27;Éditeur met l’application à jour régulièrement,
          mais l’indisponibilité ne dépasse généralement pas une dizaine de
          secondes.
        </Text>
        <Text>
          L&#x27;Éditeur met Zéro Logement Vacant à disposition sans garantie
          sur sa disponibilité. Même si l&#x27;Éditeur fait en sorte que le
          service soit toujours opérationnel, cela signifie que d’éventuelles
          indisponibilités n’ouvriront pas droit à compensation financière.
        </Text>
        <Text>
          L&#x27;Éditeur se réserve également le droit de bloquer, sans
          information préalable ni compensation financière, les usages mettant
          en péril l’utilisation du logiciel par d’autres usagers. Cela nous
          permet d’anticiper d’éventuelles attaques par déni de service.
        </Text>

        <Title as="h3" spacing="mt-4w">
          10. Modification des CGU et de la politique de confidentialité
        </Title>
        <Text>
          Nous nous engageons à vous informer en cas de modification
          substantielle des présentes CGU, et à ne pas baisser le niveau de
          confidentialité de vos données de manière substantielle sans vous en
          informer et obtenir votre consentement.
        </Text>

        <Title as="h3" spacing="mt-4w">
          11. Droit applicable et modalités de recours
        </Title>
        <Text>
          Application du droit français (législation CNIL) et compétence des
          tribunaux
        </Text>
        <Text>
          Les présentes CGU et votre utilisation du Site sont régies et
          interprétées conformément aux lois de France, et notamment à la Loi n°
          78-17 du 6 janvier 1978 relative à l&#x27;informatique, aux fichiers
          et aux libertés. Le choix de la loi applicable ne porte pas atteinte à
          vos droits en tant que consommateur conformément à la loi applicable
          de votre lieu de résidence. Si vous êtes un consommateur, vous et nous
          acceptons de se soumettre à la compétence non-exclusive des
          juridictions françaises, ce qui signifie que vous pouvez engager une
          action relative aux présentes CGU en France ou dans le pays de
          l&#x27;UE dans lequel vous vivez. Si vous êtes un professionnel,
          toutes les actions à notre encontre doivent être engagées devant une
          juridiction en France.
        </Text>
        <Text>
          En cas de litige, les parties chercheront une solution amiable avant
          toute action judiciaire. En cas d’échec de ces tentatives, toutes
          contestations à la validité, l&#x27;interprétation et / ou l’exécution
          des présentes CGU devront être portées même en cas de pluralité des
          défendeurs ou d’appel en garantie, devant les tribunaux français.
        </Text>
      </Container>
      <Container as="article" spacing="px-0">
        <Title as="h2">Vie privée et politique de confidentialité</Title>
        <Title as="h3" spacing="mt-4w">
          1. Données à caractère personnel
        </Title>
        <Text>
          Nous nous engageons à ce que la collecte et le traitement de vos
          données, effectués à partir du site soient conformes au règlement
          général sur la protection des données du 27 avril 2016, applicable
          depuis le 25 mai 2018, et à la loi informatique et libertés dans sa
          dernière version modifiée du 20 juin 2018.
        </Text>
        <Text>
          Ces dispositions fixent des règles strictes de confidentialité et de
          sécurité à toute organisation, publique et privée, dans le cadre du
          traitement des données à caractère personnel de leurs utilisateurs, et
          ce afin de protéger la vie privée de ceux-ci.
        </Text>
        <Title as="h3" spacing="mt-4w">
          2. Responsable du traitement
        </Title>
        <Text>
          Le responsable du traitement de vos données à caractère personnel est
          :
        </Text>
        <Text>Le Ministère de la Transition écologique</Text>
        <Text>
          Direction générale de l’aménagement, du logement et de la nature
        </Text>
        <Text>
          Direction de l’habitat, de l’urbanisme et des paysages (DHUP)
        </Text>
        <Text>1 place Carpeaux, 92800 Puteaux</Text>

        <Title as="h3" spacing="mt-4w">
          3. Traitement des données et utilisation
        </Title>
        <Text>
          L’Editeur ne peut utiliser les données à caractère personnel des
          Utilisateurs qu’à des fins à la fois légitimes et nécessaires, afin de
          remplir la mission de service public dont il est investi. Cela
          signifie concrètement qu’il ne traite ces données à caractère
          personnel qu’à fin de contacter les Utilisateurs
        </Text>
        <ul>
          <li>pour les informer des développements de la solution,</li>
        </ul>
        <ul>
          <li>
            les interroger sur l’utilisation de l’outil ou des enjeux connexes
            d’urbanisme et d’habitat,
          </li>
        </ul>
        <ul>
          <li>leur soumettre une nouvelle fonctionnalité à tester,</li>
        </ul>
        <ul>
          <li>et/ou les inviter à un événement.</li>
        </ul>
        <Text>
          La nature des opérations réalisées sur les données est le stockage de
          ces données.
        </Text>

        <Title as="h3" spacing="mt-4w">
          4. Données personnelles collectées
        </Title>
        <Text>
          Dans le cadre de l&#x27;utilisation du Site, l&#x27;Éditeur est
          susceptible de collecter les catégories de données (texte, copies
          numériques de documents, autres formats) suivantes concernant ses
          Utilisateurs :Données d&#x27;état-civil, d&#x27;identité,
          d&#x27;identification, et de contact
        </Text>

        <Title as="h3" spacing="mt-4w">
          5. Délai de conservation des données personnelles
        </Title>
        <Text>
          Nous conservons les données personnelles. En cas de non connexion
          pendant 12 mois, les données personnelles associées à un compte sont
          supprimées. Les données associées à un Utilisateur sont anonymisées et
          conservées à des fins exclusivement statistiques et pourront être
          transmises aux administrations et organismes publics en charge des
          politiques du logement.
        </Text>

        <Title as="h3" spacing="mt-4w">
          6. Destinataires et communication des données personnelles à des tiers
        </Title>
        <Text>
          Vos données personnelles ne sont utilisées que par l’équipe Zéro
          Logement Vacant, et ne font l&#x27;objet d&#x27;aucune communication
          de la part du site à des tiers excepté des sous-traitants du service
          agissant uniquement dans le cadre de la finalité du traitement définie
          dans les présentes CGU.
        </Text>

        <Title as="h3" spacing="mt-4w">
          7. Cookies
        </Title>
        <Text bold>Finalité des cookies</Text>
        <Text>
          Vous êtes informé que l&#x27;Éditeur dépose des cookies sur votre
          terminal. Vous pouvez refuser l’utilisation des cookies non
          obligatoires (c’est-à-dire ceux non strictement nécessaires au
          fonctionnement du site). Les cookies sont utilisés pour des fins
          statistiques notamment pour optimiser les services rendus à
          l&#x27;Utilisateur, à partir du traitement des informations concernant
          la fréquence d&#x27;accès, la personnalisation des pages ainsi que les
          opérations réalisées et les informations consultées. Les cookies
          enregistrent des informations relatives à la navigation sur le service
          (les pages que vous avez consultées, la date et l&#x27;heure de la
          consultation...) qui pourront être lues lors de vos visites
          ultérieures.
        </Text>
        <Text bold>Durée de conservation des cookies</Text>
        <Text>
          Conformément aux recommandations de la CNIL, la durée maximale de
          conservation des cookies est de 13 mois au maximum après leur premier
          dépôt dans le terminal de l&#x27;Utilisateur, tout comme la durée de
          la validité du consentement de l’Utilisateur à l’utilisation de ces
          cookies. La durée de vie des cookies n’est pas prolongée à chaque
          visite. Le consentement de l’Utilisateur devra donc être renouvelé à
          l&#x27;issue de ce délai.
        </Text>
        <Text bold>Droit de l&#x27;Utilisateur de refuser les cookies</Text>
        <Text>
          Vous reconnaissez avoir été informé que l&#x27;Éditeur peut avoir
          recours à des cookies. Si vous ne souhaitez pas que des cookies soient
          utilisés sur votre terminal, la plupart des navigateurs vous
          permettent de désactiver les cookies en passant par les options de
          réglage.
        </Text>

        <Title as="h3" spacing="mt-4w">
          8. Données techniques
        </Title>
        <Text bold>Collecte des données techniques</Text>
        <Text>
          Afin d’assurer la sécurité informatique du Site et à des fins
          statistiques et d’amélioration du Site, nous pouvons collecter et
          conserver les données techniques relatives à votre appareil (adresse
          IP, fournisseur d&#x27;accès à Internet, type d’appareil utilisé).
        </Text>
        <Text bold>Durée de conservation des données techniques</Text>
        <Text>
          Les données techniques anonymisées sont conservées sans limitation de
          durée.
        </Text>

        <Title as="h3" spacing="mt-4w">
          9. Droits des utilisateurs
        </Title>
        <Text>
          Nous nous engageons à prendre les mesures techniques et
          organisationnelles appropriées afin de garantir la sécurité du
          traitement des données à caractère personnel de chacun,
        </Text>
        <Text>
          En application du règlement général sur la protection des données et
          de la loi informatique et aux libertés, vous disposez d’un droit
          d’accès, de rectification, de limitation et d’opposition. Vous avez
          également la possibilité de demander la suppression de vos données.
        </Text>
        <Text>
          Par mail : 
          <AppLink to="mailto:zlv@betagouv.fr">zlv@beta.gouv.fr</AppLink>
        </Text>
        <Text>Par voie postale :</Text>
        <Text spacing="mb-0">
          Ministère de la Transition écologique et solidaire
        </Text>
        <Text spacing="mb-0">
          Direction Générale de l&#x27;Aménagement, du Logement et de la Nature
        </Text>
        <Text spacing="mb-0">
          Direction de l’habitat, de l’urbanisme et des paysages
        </Text>
        <Text>Zéro Logement Vacant</Text>
        <Text>1 place Carpeaux, 92800 Puteaux</Text>
        <Text>
          Cette demande écrite est accompagnée d’une copie du titre d’identité
          avec signature du titulaire de la pièce, en précisant l’adresse à
          laquelle la réponse doit être envoyée.
        </Text>
        <Text>
          Le délégué à la protection des données du ministère de la transition
          écologique et solidaire peut également être contacté à l’adresse
          suivante :
        </Text>
        <Text>dpd.daj.sg@developpement-durable.gouv.fr</Text>
        <Text>
          Conformément au règlement général sur la protection des données, vous
          disposez du droit d’introduire une réclamation auprès de la CNIL (3
          place de Fontenoy – TSA 80715 – 75334 PARIS CEDEX 07). Les modalités
          de réclamation sont précisées sur le site de la CNIL : www.cnil.fr.
        </Text>

        <Text>Portabilité des données</Text>
        <Text>
          L&#x27;Éditeur s&#x27;engage à vous offrir la possibilité de vous
          faire restituer l&#x27;ensemble des données vous concernant sur simple
          demande. L&#x27;Utilisateur se voit ainsi garantir une meilleure
          maîtrise de ses données, et garde la possibilité de les réutiliser.
          Ces données devront être fournies dans un format ouvert et aisément
          réutilisable.
        </Text>

        <Text>Suppression des données après suppression du compte</Text>
        <Text>
          Des moyens de purge de données sont mis en place afin d&#x27;en
          prévoir la suppression effective dès lors que la durée de conservation
          ou d&#x27;archivage nécessaire à l&#x27;accomplissement des finalités
          déterminées ou imposées est atteinte. Conformément à la loi n°78-17 du
          6 janvier 1978 relative à l&#x27;informatique, aux fichiers et aux
          libertés, vous disposez par ailleurs de la possibilité de demander la
          suppression de vos données, que vous pouvez exercer à tout moment en
          nous contactant directement à l’adresse 
          <AppLink to="mailto:zlv@betagouv.fr">zlv@beta.gouv.fr</AppLink>.
        </Text>

        <Title as="h3" spacing="mt-4w">
          10. Procédure en cas de violations de données à caractère personnel
        </Title>
        <Text>
          Nous nous engageons à mettre en œuvre toutes les mesures techniques et
          organisationnelles appropriées afin de garantir un niveau de sécurité
          adapté au regard des risques d&#x27;accès accidentels, non autorisés
          ou illégaux, de divulgation, d&#x27;altération, de perte ou encore de
          destruction des données personnelles vous concernant.
        </Text>
        <Text>
          Dans l&#x27;éventualité où nous prendrions connaissance d&#x27;un
          accès illégal aux données personnelles vous concernant stockées sur
          nos serveurs ou ceux de nos prestataires, ou d&#x27;un accès non
          autorisé ayant pour conséquence la réalisation des risques identifiés
          ci-dessus, nous nous engageons à :
        </Text>
        <ul>
          <li>Vous notifier l&#x27;incident dans les plus brefs délais ;</li>
        </ul>
        <ul>
          <li>Examiner les causes de l&#x27;incident et vous en informer ;</li>
        </ul>
        <ul>
          <li>
            Prendre les mesures nécessaires dans la limite du raisonnable afin
            d&#x27;amoindrir les effets négatifs et préjudices pouvant résulter
            dudit incident.
          </li>
        </ul>
        <ul>
          <li>
            Nous nous assurerons également que le nécessaire soit fait quant à
            la notification de la violation en question à la CNIL dans les 72
            heures après en avoir pris connaissance, à moins que la violation ne
            présente pas de risque pour vos droits et libertés
          </li>
        </ul>

        <Title as="h3" spacing="mt-4w">
          11. Stockage des données personnelles à l&#x27;étranger
        </Title>
        <Text>
          Nous nous engageons à ne pas stocker les données personnelles de nos
          Utilisateurs en dehors de l’Union européenne, y compris pour nos
          sous-traitants.
        </Text>
      </Container>
    </MainContainer>
  );
}

export default LegalNoticesView;

import { Footer as DSFRFooter } from '@codegouvfr/react-dsfr/Footer';
import { useUser } from '../../hooks/useUser';

function Footer() {
  const { isAuthenticated } = useUser();
  return (
    <DSFRFooter
      accessibility="non compliant"
      accessibilityLinkProps={{
        to: '/accessibilite',
      }}
      termsLinkProps={{
        to: '/mentions-legales',
        content: 'Politique de confidentialité',
      }}
      contentDescription="Zéro Logement Vacant aide les collectivités à mobiliser les propriétaires de logements vacants de longue durée."
      linkList={[
        {
          categoryName: 'Liens utiles',
          links: [
            {
              linkProps: {
                to: 'mailto:contact@zerologementvacant.beta.gouv.fr',
              },
              text: 'Nous contacter',
            },
            {
              linkProps: {
                to: 'https://zerologementvacant.crisp.help/fr/',
              },
              text: 'FAQ',
            },
            {
              linkProps: {
                to: 'https://zlv.notion.site/Feuille-route-publique-Z-ro-Logement-Vacant-19355f27a5d740e4888b57027eed6441',
              },
              text: 'Nouveautés',
            },
          ],
        },
        { categoryName: '', links: [{ linkProps: { to: '' }, text: '' }] },
        {
          categoryName: 'Informations légales',
          links: [
            {
              linkProps: {
                to: '/mentions-legales',
              },
              text: 'Mentions légales & CGU',
            },
            {
              linkProps: {
                to: '/stats',
              },
              text: 'Statistiques',
            },
          ],
        },
        { categoryName: '', links: [{ linkProps: { to: '' }, text: '' }] },
        {
          categoryName: 'Navigation',
          links: isAuthenticated
            ? [
                {
                  linkProps: {
                    to: '/parc-de-logements',
                  },
                  text: 'Parc de logements',
                },
                {
                  linkProps: {
                    to: '/campagnes',
                  },
                  text: 'Campagnes',
                },
                {
                  linkProps: {
                    to: '/ressources',
                  },
                  text: 'Ressources',
                },
                {
                  linkProps: {
                    to: '/compte',
                  },
                  text: 'Profil',
                },
              ]
            : [
                {
                  linkProps: {
                    to: '/connexion',
                  },
                  text: 'Connexion',
                },
              ],
        },
      ]}
    />
  );
}

export default Footer;

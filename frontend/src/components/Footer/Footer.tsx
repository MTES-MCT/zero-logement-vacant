import React from 'react';
import Footer from '@codegouvfr/react-dsfr/Footer';

function Footer() {
  return (
    <Footer
      accessibility="non compliant"
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
          links: [
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
                to: '/informations-publiques',
              },
              text: 'Informations publiques',
            },
            {
              linkProps: {
                to: '/compte',
              },
              text: 'Profil',
            },
            {
              linkProps: {
                to: '/messagerie',
              },
              text: 'Messagerie',
            },
            {
              linkProps: {
                to: '/ressources',
              },
              text: 'Ressources',
            },
          ],
        },
      ]}
    />
  );
}

export default Footer;

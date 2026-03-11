import { Footer as DSFRFooter, type FooterProps } from '@codegouvfr/react-dsfr/Footer';

import { useUser } from '../../hooks/useUser';
import anah from '../../assets/images/anah.svg';
import fnv from '../../assets/images/france-nation-verte.svg';
import styles from './footer.module.scss';

function Footer() {
  const { isAuthenticated } = useUser();
  return (
    <DSFRFooter
      accessibility="non compliant"
      accessibilityLinkProps={{
        to: 'https://zerologementvacant.beta.gouv.fr/accessibilite-de-la-plateforme/'
      }}
      brandTop={
        <>
          Ministère
          <br />
          de la Ville
          <br />
          et du Logement
        </>
      }
      classes={{
        partnersLogos: styles.partners
      }}
      homeLinkProps={{
        className: styles.brandLink,
        to: 'https://www.ecologie.gouv.fr/',
        title: 'Ministère de la Ville et du Logement'
      }}
      termsLinkProps={{
        to: 'https://zerologementvacant.beta.gouv.fr/mentions-legales'
      }}
      bottomItems={[
        {
          text: 'Politique de confidentialité',
          linkProps: {
            to: 'https://zerologementvacant.beta.gouv.fr/politique-de-confidentialite-de-zero-logement-vacant/',
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      ]}
      contentDescription="Zéro Logement Vacant aide les collectivités à mobiliser les propriétaires de logements vacants de longue durée."
      bottomItems={
        !isAuthenticated
          ? [{ linkProps: { to: '/connexion' }, text: 'Connexion' }]
          : []
      }
      linkList={
        [
          ...(isAuthenticated
            ? [
                {
                  categoryName: 'Navigation',
                  links: [
                    { linkProps: { to: '/parc-de-logements' }, text: 'Parc de logements' },
                    { linkProps: { to: '/campagnes' }, text: 'Campagnes' },
                    { linkProps: { to: '/ressources' }, text: 'Ressources' },
                    { linkProps: { to: '/compte' }, text: 'Profil' }
                  ] as FooterProps.LinkList.Links
                }
              ]
            : []),
          {
            categoryName: 'Liens utiles',
            links: [
              {
                linkProps: { to: 'mailto:contact@zerologementvacant.beta.gouv.fr' },
                text: 'Nous contacter'
              },
              {
                linkProps: { to: 'https://zerologementvacant.crisp.help/fr/' },
                text: "Centre d\u2019aide et guide d\u2019utilisation"
              },
              {
                linkProps: {
                  to: 'https://zlv.notion.site/Feuille-route-publique-Z-ro-Logement-Vacant-19355f27a5d740e4888b57027eed6441'
                },
                text: 'Nouveaut\u00e9s'
              },
              {
                linkProps: { to: 'https://zerologementvacant.beta.gouv.fr/statistiques' },
                text: 'Statistiques'
              }
            ] as FooterProps.LinkList.Links
          }
        ] as unknown as FooterProps.LinkList.List
      }
      partnersLogos={{
        sub: [
          {
            alt: "Agence nationale de l’habitat",
            imgUrl: anah,
            linkProps: {
              to: 'https://www.anah.gouv.fr/',
              title: "Agence nationale de l’habitat"
            }
          },
          {
            alt: 'France Nation Verte',
            imgUrl: fnv,
            linkProps: {
              to: 'https://www.info.gouv.fr/france-nation-verte',
              title: 'France Nation Verte'
            }
          }
        ]
      }}
      websiteMapLinkProps={{
        to: '/plan-du-site'
      }}
    />
  );
}

export default Footer;

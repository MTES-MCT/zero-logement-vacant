import { Footer as DSFRFooter } from '@codegouvfr/react-dsfr/Footer';

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
        to: 'https://zerologementvacant.beta.gouv.fr/accessibilite'
      }}
      brandTop={
        <>
          Ministères <br />
          Territoires <br />
          Écologie <br /> 
          Logement
        </>
      }
      classes={{
        partnersLogos: styles.partners
      }}
      homeLinkProps={{
        className: styles.brandLink,
        to: 'https://www.ecologie.gouv.fr/',
        title: 'Accueil - Zéro Logement Vacant'
      }}
      termsLinkProps={{
        to: 'https://zerologementvacant.beta.gouv.fr/mentions-legales',
        content: 'Politique de confidentialité'
      }}
      contentDescription="Zéro Logement Vacant aide les collectivités à mobiliser les propriétaires de logements vacants de longue durée."
      linkList={[
        {
          categoryName: 'Liens utiles',
          links: [
            {
              linkProps: {
                to: 'mailto:contact@zerologementvacant.beta.gouv.fr'
              },
              text: 'Nous contacter'
            },
            {
              linkProps: {
                to: 'https://zerologementvacant.crisp.help/fr/'
              },
              text: 'FAQ'
            },
            {
              linkProps: {
                to: 'https://zlv.notion.site/Feuille-route-publique-Z-ro-Logement-Vacant-19355f27a5d740e4888b57027eed6441'
              },
              text: 'Nouveautés'
            }
          ]
        },
        { categoryName: '', links: [{ linkProps: { to: '' }, text: '' }] },
        {
          categoryName: 'Informations légales',
          links: [
            {
              linkProps: {
                to: 'https://zerologementvacant.beta.gouv.fr/mentions-legales'
              },
              text: 'Mentions légales & CGU'
            },
            {
              linkProps: {
                to: 'https://zerologementvacant.beta.gouv.fr/statistiques'
              },
              text: 'Statistiques'
            }
          ]
        },
        { categoryName: '', links: [{ linkProps: { to: '' }, text: '' }] },
        {
          categoryName: 'Navigation',
          links: isAuthenticated
            ? [
                {
                  linkProps: {
                    to: '/parc-de-logements'
                  },
                  text: 'Parc de logements'
                },
                {
                  linkProps: {
                    to: '/campagnes'
                  },
                  text: 'Campagnes'
                },
                {
                  linkProps: {
                    to: '/ressources'
                  },
                  text: 'Ressources'
                },
                {
                  linkProps: {
                    to: '/compte'
                  },
                  text: 'Profil'
                }
              ]
            : [
                {
                  linkProps: {
                    to: '/connexion'
                  },
                  text: 'Connexion'
                }
              ]
        }
      ]}
      partnersLogos={{
        sub: [
          {
            alt: "Logo de l'Agence nationale de l’habitat",
            imgUrl: anah,
            linkProps: {
              to: 'https://www.anah.gouv.fr/',
              title: 'Agence national de l’habitat'
            }
          },
          {
            alt: 'Logo de France Nation Verte',
            imgUrl: fnv,
            linkProps: {
              to: 'https://www.info.gouv.fr/france-nation-verte',
              title: 'France Nation Verte'
            }
          }
        ]
      }}
    />
  );
}

export default Footer;

import React, { ComponentPropsWithoutRef } from 'react';
import {
  Footer,
  FooterBody,
  FooterBodyItem,
  FooterBottom,
  FooterLink,
  FooterTop,
  FooterTopCategory,
  Link,
  Logo,
} from '@dataesr/react-dsfr';
import { Link as RouterLink } from 'react-router-dom';

import styles from './app-footer.module.scss';

type FooterLinkProps = ComponentPropsWithoutRef<typeof FooterLink>;

function AppFooter() {
  function FooterInternalLink(props: FooterLinkProps) {
    return (
      <FooterLink
        {...props}
        className={styles.link}
        asLink={<RouterLink to={props.href ?? '#'} />}
      />
    );
  }

  function FooterExternalLink(props: FooterLinkProps) {
    return <FooterLink {...props} className={styles.link} />;
  }

  return (
    <Footer>
      <FooterTop align="start">
        <FooterTopCategory title="Liens utiles" n="4">
          <FooterExternalLink href="mailto:contact@zerologementvacant.beta.gouv.fr">
            Nous contacter
          </FooterExternalLink>
          <FooterExternalLink href="https://zerologementvacant.crisp.help/fr/">
            FAQ
          </FooterExternalLink>
          <FooterExternalLink href="https://zlv.notion.site/Feuille-route-publique-Z-ro-Logement-Vacant-19355f27a5d740e4888b57027eed6441">
            Nouveautés
          </FooterExternalLink>
        </FooterTopCategory>
        <FooterTopCategory title="Informations légales" n="4">
          <FooterInternalLink href="/mentions-legales">
            Mentions légales & CGU
          </FooterInternalLink>
          <FooterExternalLink href="https://zerologementvacant.beta.gouv.fr/stats">
            Statistiques
          </FooterExternalLink>
        </FooterTopCategory>
        <FooterTopCategory title="Navigation" n="4">
          <FooterInternalLink href="/parc-de-logements">
            Parc de logements
          </FooterInternalLink>
          <FooterInternalLink href="/campagnes">Campagnes</FooterInternalLink>
          <FooterInternalLink href="/informations-publiques">
            Informations publiques
          </FooterInternalLink>
          <FooterInternalLink href="/compte">Profil</FooterInternalLink>
          <FooterInternalLink href="/messagerie">Messagerie</FooterInternalLink>
          <FooterInternalLink href="/ressources">Ressources</FooterInternalLink>
        </FooterTopCategory>
      </FooterTop>
      <FooterBody description="Zéro Logement Vacant aide les collectivités à mobiliser les propriétaires de logements vacants de longue durée.">
        <Logo splitCharacter={10}>Ministère de la transition écologique</Logo>
        <FooterBodyItem>
          <Link href="https://legifrance.gouv.fr" target="_blank">
            legifrance.gouv.fr
          </Link>
        </FooterBodyItem>
        <FooterBodyItem>
          <Link href="https://gouvernement.fr" target="_blank">
            gouvernement.fr
          </Link>
        </FooterBodyItem>
        <FooterBodyItem>
          <Link href="https://service-public.fr" target="_blank">
            service-public.fr
          </Link>
        </FooterBodyItem>
        <FooterBodyItem>
          <Link href="https://data.gouv.fr" target="_blank">
            data.gouv.fr
          </Link>
        </FooterBodyItem>
      </FooterBody>
      <FooterBottom>
        <FooterLink href="https://beta.gouv.fr" target="_blank">
          Les startups d’Etat
        </FooterLink>
        <FooterLink href="mailto:contact@zerologementvacant.beta.gouv.fr">
          Nous écrire
        </FooterLink>
        <FooterLink href="/accessibilite">
          Accessibilité: non conforme
        </FooterLink>
        <FooterLink
          href="https://github.com/MTES-MCT/zero-logement-vacant"
          target="_blank"
        >
          Code source
        </FooterLink>
        <FooterLink
          href="https://zlv.notion.site/Politique-de-confidentialit-bb23ade15fc442fbbc3976a4ef840c76"
          target="_blank"
        >
          Politique de confidentialité
        </FooterLink>
        <FooterLink href="/stats">Statistiques</FooterLink>
      </FooterBottom>
    </Footer>
  );
}

export default AppFooter;

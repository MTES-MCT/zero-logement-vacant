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

type FooterInternalLinkProps = ComponentPropsWithoutRef<typeof FooterLink>;

function AppFooter() {
  function FooterInternalLink(props: FooterInternalLinkProps) {
    return (
      <FooterLink
        {...props}
        asLink={<RouterLink className={styles.link} to={props.href ?? '#'} />}
      />
    );
  }

  return (
    <Footer>
      <FooterTop align="start">
        <FooterTopCategory title="Liens utiles" n="4">
          <FooterInternalLink href="/">Nous contacter</FooterInternalLink>
          <FooterInternalLink href="/">FAQ</FooterInternalLink>
          <FooterInternalLink href="/">Nouveautés</FooterInternalLink>
        </FooterTopCategory>
        <FooterTopCategory title="Informations légales" n="4">
          <FooterInternalLink href="/">Mentions légales</FooterInternalLink>
          <FooterInternalLink href="/">Statistiques</FooterInternalLink>
          <FooterInternalLink href="/">CGU</FooterInternalLink>
        </FooterTopCategory>
        <FooterTopCategory title="Navigation" n="4">
          <FooterInternalLink href="/accueil">Accueil</FooterInternalLink>
          <FooterInternalLink href="/campagnes">
            Logements suivis
          </FooterInternalLink>
          <FooterInternalLink href="/base-de-donnees">
            Base de données
          </FooterInternalLink>
          <FooterInternalLink href="/ressources">Ressources</FooterInternalLink>
          <FooterInternalLink href="/territoire">
            Votre territoire
          </FooterInternalLink>
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

import { Header as DSFRHeader } from '@codegouvfr/react-dsfr/Header';

import logo from '../../assets/images/zlv.svg';
import styles from './header.module.scss';

function Header() {
  return (
    <DSFRHeader
      brandTop={
        <>
          Ministère <br />
          du Logement <br />
          et de la Rénovation <br />
          urbaine
        </>
      }
      className={styles.shadowless}
      homeLinkProps={{
        to: '/',
        title: 'Accueil - Zéro Logement Vacant'
      }}
      operatorLogo={{
        alt: 'Zéro Logement Vacant',
        imgUrl: logo,
        orientation: 'horizontal'
      }}
    />
  );
}

export default Header;

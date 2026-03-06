import { Header as DSFRHeader } from '@codegouvfr/react-dsfr/Header';

import logo from '../../assets/images/zlv.svg';
import styles from './header.module.scss';

function Header() {
  return (
    <DSFRHeader
      brandTop={
        <>
         Ministère<br />
          de la Ville<br />
          et du Logement
        </>
      }
      className={styles.shadowless}
      homeLinkProps={{
        to: '/',
        title: 'Accueil - Zéro Logement Vacant',
        tabIndex: 0
      }}
      operatorLogo={{
        alt: 'Zéro Logement Vacant',
        imgUrl: logo,
        orientation: 'horizontal',
        linkProps: {
          to: '/',
          title: 'Accueil - Zéro Logement Vacant',
          tabIndex: 0
        }
      }}
    />
  );
}

export default Header;

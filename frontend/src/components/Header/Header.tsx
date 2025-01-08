import { Header as DSFRHeader } from '@codegouvfr/react-dsfr/Header';

import logo from '../../assets/images/zlv.svg';
import styles from './header.module.scss';

function Header() {
  return (
    <DSFRHeader
      brandTop={
        <>
          Ministère <br />
          de l’Aménagement <br />
          du territoire <br />
          et de la <br />
          Décentralisation
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

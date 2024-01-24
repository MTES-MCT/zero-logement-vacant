import { Text } from '../../components/_dsfr';
import React from 'react';
import AppLink from '../../components/_app/AppLink/AppLink';
import { useAppDispatch } from '../../hooks/useStore';
import { logout } from '../../store/actions/authenticationAction';
import { useUser } from '../../hooks/useUser';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';

const AccountSideMenu = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { establishment } = useUser();

  const isCurrentLocation = location.pathname === '/compte';

  return (
    <>
      <Text className="color-grey-625" size="sm" bold spacing="mb-0">
        Votre compte
      </Text>
      <div className="fr-py-2w">
        <AppLink
          className={classNames('fr-ml-0', { 'weight-700': isCurrentLocation })}
          isSimple={isCurrentLocation}
          to="/compte"
          iconId="fr-icon-user-fill"
          iconPosition="left"
        >
          Gérer votre profil
        </AppLink>
      </div>
      <hr className="fr-py-1w" />
      <Text className="color-grey-625" size="sm" bold spacing="mb-0">
        {establishment?.name}
      </Text>
      <div className="fr-py-2w">
        <AppLink
          to={{ pathname: 'https://consultdf.cerema.fr/consultdf/' }}
          target="_blank"
          iconId="fr-icon-group-fill"
          iconPosition="left"
        >
          Gérer les utilisateurs via consultdf
        </AppLink>
      </div>
      <div className="fr-pb-2w">
        <AppLink
          to="/utilisateurs"
          iconId="fr-icon-group-fill"
          iconPosition="left"
        >
          Voir les utilisateurs
        </AppLink>
      </div>
      <div className="fr-pb-2w">
        <AppLink
          to="/autres-etablissements"
          iconId="fr-icon-group-fill"
          iconPosition="left"
        >
          Voir les autres établissements
        </AppLink>
      </div>
      <hr className="fr-py-1w" />
      <AppLink
        to="#"
        iconId="fr-icon-logout-box-r-fill"
        iconPosition="left"
        onClick={() => dispatch(logout())}
        size="md"
      >
        Se déconnecter
      </AppLink>
    </>
  );
};

export default AccountSideMenu;
